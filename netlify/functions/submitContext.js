const mysql = require('mysql2/promise');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    try {
        const data = JSON.parse(event.body);
        const { sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room } = data;

        const db = await mysql.createConnection({
            host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });

        // 1. PWA 业务上下文落盘
        await db.execute(
            `INSERT INTO inspection_context (sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room) VALUES (?, ?, ?, ?, ?, ?)`,
            [sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room]
        );

        // 2. 回头扫视：近 10 分钟内，硬件日志传上来了没？
        const [logs] = await db.execute(
            `SELECT * FROM hardware_raw_logs WHERE sn = ? AND created_at >= NOW() - INTERVAL 10 MINUTE ORDER BY created_at DESC LIMIT 1`,
            [sn]
        );

        let status = "业务信息已录入，正在等待设备上传日志...";
        if (logs.length > 0) {
            // 查到了！触发合并与推送
            await triggerMergeAndPush(data, logs[0]);
            status = "双流数据匹配成功！已生成 AI 洞察并推送至企业微信。";
        }

        await db.end();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: status }) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
};

// 内部函数：调用 Gemini 并在企微发卡片
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