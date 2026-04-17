const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*' };
    try {
        const sn = event.queryStringParameters.sn;
        if (!sn) throw new Error("缺少设备 SN 码");

        const db = await mysql.createConnection({
            host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });

        // 分别获取该 SN 最新的一条业务数据和日志数据
        const [ctxRows] = await db.execute(`SELECT hospital_name, current_room FROM inspection_context WHERE sn = ? ORDER BY created_at DESC LIMIT 1`, [sn]);
        const [logRows] = await db.execute(`SELECT valid_sensor_count FROM hardware_raw_logs WHERE sn = ? ORDER BY created_at DESC LIMIT 1`, [sn]);

        await db.end();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                hospital_name: ctxRows.length > 0 ? ctxRows[0].hospital_name : "暂未绑定",
                current_room: ctxRows.length > 0 ? ctxRows[0].current_room : "未知",
                valid_sensor_count: logRows.length > 0 ? logRows[0].valid_sensor_count : 0,
                sync_time: new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })
            })
        };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
};