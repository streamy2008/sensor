import { Activity, StopCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface StatsResponse {
  lastSync: string;
  validCurrentRoom: number;
  valid30Days: number;
  aiInsights: string;
}

export function Monitor({ deviceSn, setDeviceSn }: { deviceSn: string; setDeviceSn: (sn: string) => void }) {
  const [isPolling, setIsPolling] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState('');
  const [pendingTasks, setPendingTasks] = useState(0);

  useEffect(() => {
    // Refresh pending tasks periodically (or we can just poll the DB)
    const checkTasks = async () => {
      const { getOfflineTasks } = await import('./db');
      const tasks = await getOfflineTasks();
      setPendingTasks(tasks.length);
    };
    checkTasks();
    const inv = setInterval(checkTasks, 5000);
    return () => clearInterval(inv);
  }, []);

  const pullData = async () => {
    let currentSn = deviceSn;
    // 自动填写SN码
    if (!currentSn) {
      currentSn = `SN123456`; // 默认给定一个测试SN码
      setDeviceSn(currentSn);
    }
    setError('');
    
    try {
      // 模拟上传设备log信息
      console.log(`[Log Upload] Posting device logs online for SN: ${currentSn}...`, {
        timestamp: new Date().toISOString(),
        event: 'telemetry_sync',
        battery: '88%',
        signalStrength: '-50dBm'
      });
      
      const mockData = {
        lastSync: new Date().toLocaleTimeString(),
        validCurrentRoom: Math.floor(Math.random() * 5) + 40,
        valid30Days: Math.floor(Math.random() * 50) + 100,
        aiInsights: '设备 Log 已后台静默上传。当前 OR-3 中传感器密度良好，建议 48 小时内补充耗材。'
      };
      setStats(mockData);
    } catch (err) {
      console.error(err);
      setError('数据拉取失败');
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPolling) {
      pullData(); // fetch immediately
      interval = setInterval(pullData, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, deviceSn]);

  return (
    <section className="glass-card">
      <h2>设备数据</h2>
      
      <button 
        className="pull-data-btn" 
        id="btn_pull_data"
        onClick={() => setIsPolling(true)}
      >
        <span>↻ 拉取设备数据</span>
      </button>

      {error ? (
        <div className="p-3 mb-4 rounded-xl bg-red-50 text-[#FF3B30] text-[13px] border border-red-100 flex-1">
          {error}
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center flex-1 text-text-secondary">
           <Activity className="animate-pulse mb-2 text-[#86868B]" size={28} />
           <p className="text-[13px]">等待拉取设备数据...</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1">
            <div className="monitor-grid">
                <div className="stat-box">
                    <div className="stat-label">当前 SN 数量</div>
                    <div className="stat-value">{stats.validCurrentRoom}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">30天活跃</div>
                    <div className="stat-value" style={{ color: 'var(--color-accent-green)' }}>{stats.valid30Days}</div>
                </div>
            </div>

            <div className="stat-box" style={{ marginTop: '16px' }}>
                <div className="stat-label">上次同步</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{stats.lastSync}</div>
            </div>

            <div className="ai-insight">
                <div className="ai-title">AI 业务洞察</div>
                <div className="ai-content">{stats.aiInsights}</div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>本地缓存: {pendingTasks} 条待发送</span>
                {isPolling && (
                    <button 
                      onClick={() => setIsPolling(false)}
                      style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      停止轮询
                    </button>
                )}
            </div>
        </div>
      )}
    </section>
  );
}
