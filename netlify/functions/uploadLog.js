const mysql = require('mysql2/promise');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const { sn, log_content, valid_sensor_count } = data;

        const db = await mysql.createConnection({
            host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });

        // 1. APK 硬件日志落盘
        await db.execute(
            `INSERT INTO hardware_raw_logs (sn, log_content, valid_sensor_count) VALUES (?, ?, ?)`,
            [sn, JSON.stringify(log_content), valid_sensor_count]
        );

        // 2. 回头扫视：近 10 分钟内，PWA 护士填的表单传上来了没？
        const [contexts] = await db.execute(
            `SELECT * FROM inspection_context WHERE sn = ? AND created_at >= NOW() - INTERVAL 10 MINUTE ORDER BY created_at DESC LIMIT 1`,
            [sn]
        );

        if (contexts.length > 0) {
            // 查到了！触发合并与推送
            await triggerMergeAndPush(contexts[0], data);
        }

        await db.end();
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
};

// 内部函数：调用 Gemini 并在企微发卡片（与上面文件一致，保持解耦）
async function triggerMergeAndPush(contextData, logData) {
    let insight = "暂无AI洞察";
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `你是一个医疗运营专家。根据数据：医院名[${contextData.hospital_name}], 巡检人[${contextData.inspector_name}], 术间数[${contextData.total_rooms}], 当前术间号[${contextData.current_room}] 以及硬件日志中有效采集超10分钟的传感器数量[${logData.valid_sensor_count}]，用一句话输出业务洞察，例如提示翻台率、耗材消耗或备货建议。不要废话。`;
            const result = await model.generateContent(prompt);
            insight = result.response.text().trim();
        } catch (e) { console.error("AI 报错:", e); }
    }

    if (process.env.WECOM_WEBHOOK) {
        await axios.post(process.env.WECOM_WEBHOOK, {
            "医院名称": contextData.hospital_name,
            "巡检人": contextData.inspector_name,
            "当前术间号": contextData.current_room,
            "有效传感器数": logData.valid_sensor_count,
            "AI业务洞察": insight,
            "合并时间": new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        });
    }
}