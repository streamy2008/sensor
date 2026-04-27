// netlify/functions/upload.js
const mysql = require('mysql2/promise');

exports.handler = async (event, context) => {
    // 1. 只接收 POST 请求
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. 解析前端发来的数据
        const data = JSON.parse(event.body);
        const { sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room } = data;

        console.log("收到前端上报数据，准备连接数据库...", sn);

        // 3. 连接你的阿里云 MySQL 数据库
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // 4. 将前端业务数据存入 inspection_context 表
        await connection.execute(`
            INSERT INTO inspection_context 
            (sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room]);

        await connection.end();
        console.log("✅ 数据库落库成功！");

        // 5. 呼叫企业微信机器人
        if (process.env.WECOM_WEBHOOK) {
            const wecomPayload = {
                msgtype: "markdown",
                markdown: {
                    content: `**🔔 收到新的巡检上报**\n> 医院: <font color="info">${hospital_name}</font>\n> 巡检人: ${inspector_name}\n> SN码: ${sn}\n> 当前术间: ${current_room}`
                }
            };

            await fetch(process.env.WECOM_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wecomPayload)
            });
            console.log("✅ 企业微信推送成功！");
        }

        // 6. 返回成功信号给前端
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "数据落库并推送成功！" })
        };

    } catch (error) {
        console.error("❌ 云函数执行报错:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};