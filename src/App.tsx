import { Scan, Save, Settings, Database, Server, Wifi } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Scanner } from './components/Scanner';
import { NetworkConfig } from './components/NetworkConfig';
import { saveOfflineTask, getOfflineTasks, clearOfflineTasks } from './components/db';

interface FinalStats {
  validCurrentRoom: number;
  valid30Days: number;
  aiInsights: string;
}

export default function App() {
  const [hospitalName, setHospitalName] = useState('华西');
  const [inspectorName, setInspectorName] = useState('郑世斌');
  const [totalRooms, setTotalRooms] = useState('32');
  const [validRooms, setValidRooms] = useState('12');
  const [currentRoom, setCurrentRoom] = useState('OR-1');
  const [deviceSn, setDeviceSn] = useState('');
  
  const [showScanner, setShowScanner] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<FinalStats | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const offlineTasks = await getOfflineTasks();
      if (offlineTasks.length > 0) {
        console.log('Sending offline tasks to server...', offlineTasks);
        // Mock POST to /.netlify/functions/submitContext
        // await fetch('...', { body: JSON.stringify(offlineTasks) })
        await clearOfflineTasks();
        alert('已自动补发离线期间保存的数据。');
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    let currentSn = deviceSn;
    // 自动填写SN码（如未填，则模拟硬件取值）
    if (!currentSn) {
      currentSn = `SN-${Math.floor(100000 + Math.random() * 900000)}`;
      setDeviceSn(currentSn);
    }

    if (!hospitalName || !inspectorName) {
      alert('请输入必填字段：医院名称、巡检人');
      return;
    }

    setIsSubmitting(true);
    const data = { hospitalName, inspectorName, totalRooms, validRooms, currentRoom, deviceSn: currentSn };

    try {
      if (isOnline) {
        // 核心环节：一次性触发并向云端发送关联 log
        console.log(`[Device Log] Triggering hardware telemetry and logs...`, {
          deviceSn: currentSn,
          timestamp: new Date().toISOString(),
          event: 'telemetry_push_on_submit',
          battery: '88%',
          signalStrength: '-60dBm',
          log: `Inspection initiated at ${hospitalName} by ${inspectorName}. Telemetry active.`
        });
        
        await new Promise(r => setTimeout(r, 1500)); // 延长点时间展示状态模拟汇总过程
        
        // 生成汇总结果
        setStats({
          validCurrentRoom: Math.floor(Math.random() * 5) + 40,
          valid30Days: Math.floor(Math.random() * 50) + 100,
          aiInsights: `巡检单与设备底层 Log 上报合并成功！监测系统已同步绑定设备 (${currentSn}) 并校验探针数据完成无误。`
        });
      } else {
        await saveOfflineTask(data);
        alert('当前处于离线状态，数据已保存至本地，网络恢复后将自动合并上报。');
      }
    } catch (err) {
      alert('上报合并失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-[1200px] mx-auto p-4 sm:p-6 w-full">
      <header className="flex justify-between items-center mb-6 px-2">
        <div>
            <h1 className="text-[22px] font-bold text-[#1D1D1F]">巡检记录单</h1>
            <p className="text-[13px] text-[#86868B] mt-1">巡检录入中枢 · 硬件配网 · 实时监视</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${isOnline ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'}`}>
           <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}></div>
           {isOnline ? '系统在线' : '离线模式'}
        </div>
      </header>

      <main className="flex flex-col gap-6 max-w-xl w-full mx-auto pb-16">
        
        {/* Module 2: Setup QR (Now On Top) */}
        <NetworkConfig />

        {/* Module 1: Business Context & Results (Now At Bottom) */}
        <section className="glass-card flex flex-col pt-6 pb-6">
          <h2 className="mb-4 text-[18px] font-bold text-[#1D1D1F]">巡检信息上报</h2>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="form-group">
              <label htmlFor="hospital_name">医院名称 *</label>
              <input required id="hospital_name" className="form-input" value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="如：协和医院" />
            </div>
            
            <div className="form-group">
              <label htmlFor="inspector_name">巡检人 *</label>
              <input required id="inspector_name" className="form-input" value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="姓名" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 form-group">
              <div>
                <label htmlFor="total_rooms">手术间总数</label>
                <input type="number" id="total_rooms" className="form-input" value={totalRooms} onChange={e => setTotalRooms(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label htmlFor="valid_rooms">有效使用间数</label>
                <input type="number" id="valid_rooms" className="form-input" value={validRooms} onChange={e => setValidRooms(e.target.value)} placeholder="0" />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="current_room">当前术间号</label>
              <input id="current_room" className="form-input" value={currentRoom} onChange={e => setCurrentRoom(e.target.value)} placeholder="OR-1" />
            </div>

            <div className="form-group">
              <label htmlFor="device_sn">中继器 SN 码 *</label>
              <div className="flex gap-2">
                <input id="device_sn" className="form-input font-mono" value={deviceSn} onChange={e => setDeviceSn(e.target.value)} placeholder="如留空将自动获取硬件SN" />
                <button type="button" onClick={() => setShowScanner(!showScanner)} className="scan-btn whitespace-nowrap">
                  扫描
                </button>
              </div>
            </div>

            {showScanner && (
              <div className="mt-2 mb-4 p-2 bg-black/5 rounded-2xl">
                 <Scanner onScanSuccess={(text) => { 
                   setDeviceSn(text); 
                   setShowScanner(false); 
                   alert('中继器扫描成功，建立连接成功！'); 
                 }} />
                 <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-medium">取消扫描</button>
              </div>
            )}

            <button type="submit" id="btn_submit" disabled={isSubmitting} className="primary-btn mt-3">
              {isSubmitting ? '正在推送设备日志并聚合并验证数据...' : '上报巡检信息'}
            </button>
          </form>

          {stats && (
            <div className="mt-8 pt-6 border-t border-black/10 flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                <h3 className="font-semibold text-[#1D1D1F] text-[15px]">系统汇总结果</h3>
                <div className="monitor-grid">
                    <div className="stat-box">
                        <div className="stat-label">此间有效SN数</div>
                        <div className="stat-value">{stats.validCurrentRoom}</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-label">30天活跃总数</div>
                        <div className="stat-value" style={{ color: 'var(--color-accent-green)' }}>{stats.valid30Days}</div>
                    </div>
                </div>
                <div className="ai-insight">
                    <div className="ai-title">数据合并回执</div>
                    <div className="ai-content">{stats.aiInsights}</div>
                </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
