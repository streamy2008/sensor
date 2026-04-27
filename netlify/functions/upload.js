const mysql = require('mysql2/promise');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room } = data;

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // 1. 将前端业务数据存入数据库
        await connection.execute(`
            INSERT INTO inspection_context 
            (sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room]);

        // 2. 👑 核心升级：查询真实的统计数据
        // 查询当前医院、当前术间的去重 SN 数量
        const [roomRows] = await connection.execute(
            `SELECT COUNT(DISTINCT sn) as count FROM inspection_context WHERE hospital_name = ? AND current_room = ?`, 
            [hospital_name, current_room]
        );
        const validCurrentRoom = roomRows[0].count;

        // 查询全库近 30 天活跃的去重 SN 总数
        const [monthRows] = await connection.execute(
            `SELECT COUNT(DISTINCT sn) as count FROM inspection_context WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const valid30Days = monthRows[0].count;

        await connection.end();

        const aiInsights = "数据落库并推送成功！";

        // 3. 呼叫企业微信（加入图表中的汇总数据）
        if (process.env.WECOM_WEBHOOK) {
            const wecomPayload = {
                msgtype: "markdown",
                markdown: {
                    content: `**🔔 收到新的巡检上报**\n> 医院: <font color="info">${hospital_name}</font>\n> 巡检人: ${inspector_name}\n> SN码: ${sn}\n> 当前术间: ${current_room}\n\n**📊 系统汇总结果**\n> 此间有效SN数: <font color="info">${validCurrentRoom}</font>\n> 30天活跃总数: <font color="info">${valid30Days}</font>\n> 数据合并回执: <font color="comment">${aiInsights}</font>`
                }
            };

            await fetch(process.env.WECOM_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wecomPayload)
            });
        }

        // 4. 将真实的统计结果返回给前端，替换掉前端的随机数
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: aiInsights,
                stats: {
                    validCurrentRoom,
                    valid30Days
                }
            })
        };

    } catch (error) {
        console.error("❌ 云函数执行报错:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};