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

        // 1. 将前端业务数据存入 MySQL 数据库进行持久化存档
        await connection.execute(`
            INSERT INTO inspection_context 
            (sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sn, hospital_name, inspector_name, total_rooms, valid_rooms, current_room]);

        // 2. 👑 核心逻辑：从数据库实时计算业务指标
        // 查询当前医院、当前术间的去重 SN 数量
        const [roomRows] = await connection.execute(
            `SELECT COUNT(DISTINCT sn) as count FROM inspection_context WHERE hospital_name = ? AND current_room = ?`, 
            [hospital_name, current_room]
        );
        const validCurrentRoom = roomRows[0].count;

        // 查询全库近 30 天活跃的去重 SN 总数（衡量整体产品活跃规模）
        const [monthRows] = await connection.execute(
            `SELECT COUNT(DISTINCT sn) as count FROM inspection_context WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const valid30Days = monthRows[0].count;

        await connection.end();

        const aiInsights = "数据已成功上报并同步至多端系统。";

        // 3. 呼叫企业微信机器人（群聊即时通知）
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

        // 4. 🚀 按照企微最新严格 Schema 写入智能表格（已加入 30 天活跃总数）
        const WECOM_SHEET_WEBHOOK = "https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/webhook?key=5mcCobjokBLmc8jZPTEW5Qz76jTDhZXCCMJHXnHiEjsGT4XSCSINDiMZjmSnDEWJ2sj5KA5kOj5M10bUkPlJc6uivYP2DN93t1XlfqZwCGFk";

        if (WECOM_SHEET_WEBHOOK) {
            try {
                const sheetPayload = {
                    "schema": {
                        "f04Gwj": "上报时间",
                        "ftQMc5": "医院名称",
                        "ftk5Tx": "巡检人",
                        "ffFwIh": "中继器SN码",
                        "fn8TJd": "总间数",
                        "fH8nTZ": "当前术间",
                        "fPiKbv": "此间有效SN数",
                        "fCi2Hm": "30天活跃总数"
                    },
                    "add_records": [
                        {
                            "values": {
                                "f04Gwj": Date.now().toString(),       // 自动生成毫秒级时间戳字符串
                                "ftQMc5": hospital_name,               // 医院名称
                                "ftk5Tx": inspector_name,              // 巡检人
                                "ffFwIh": sn,                          // 中继器SN码
                                "fn8TJd": Number(total_rooms) || 0,    // 总间数
                                "fH8nTZ": current_room,                // 当前术间
                                "fPiKbv": validCurrentRoom,            // 此间真实有效数
                                "fCi2Hm": valid30Days                  // 🌟 30天全网活跃总数
                            }
                        }
                    ]
                };

                const sheetResponse = await fetch(WECOM_SHEET_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sheetPayload)
                });

                if (sheetResponse.ok) {
                    console.log("✅ 企微智能表格数据流转成功！");
                } else {
                    const errText = await sheetResponse.text();
                    console.error("⚠️ 企微表格写入失败:", errText);
                }
            } catch (sheetErr) {
                console.error("⚠️ 企微原生 Webhook 网络异常:", sheetErr);
            }
        }

        // 5. 将实时计算的统计结果返回给手机端 UI 展示
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
        console.error("❌ 云函数执行严重报错:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};