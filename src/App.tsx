import { Scan, Save, Settings, Database, Server, Wifi } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Scanner } from './components/Scanner';
import { NetworkConfig } from './components/NetworkConfig';
import { Monitor } from './components/Monitor';
import { saveOfflineTask, getOfflineTasks, clearOfflineTasks } from './components/db';

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
    if (!hospitalName || !inspectorName || !deviceSn) {
      alert('请输入必填字段：医院名称、巡检人、SN码');
      return;
    }

    setIsSubmitting(true);
    const data = { hospitalName, inspectorName, totalRooms, validRooms, currentRoom, deviceSn };

    try {
      if (isOnline) {
        console.log('Posting data online...', data);
        // await fetch('/.netlify/functions/submitContext', { method: 'POST', body: JSON.stringify(data) });
        await new Promise(r => setTimeout(r, 600)); // simulate network
        alert('上报成功！');
      } else {
        await saveOfflineTask(data);
        alert('当前处于离线状态，数据已保存至本地，网络恢复后将自动上报。');
      }
    } catch (err) {
      alert('上报失败');
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

      <main className="grid grid-cols-1 lg:grid-cols-[320px_320px_1fr] gap-5 flex-1 items-start">
        
        {/* Module 1: Business Context */}
        <section className="glass-card">
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
                <input required id="device_sn" className="form-input font-mono" value={deviceSn} onChange={e => setDeviceSn(e.target.value)} placeholder="SN123456" />
                <button type="button" onClick={() => setShowScanner(!showScanner)} className="scan-btn whitespace-nowrap">
                  扫描
                </button>
              </div>
            </div>

            {showScanner && (
              <div className="mt-2 mb-4 p-2 bg-black/5 rounded-2xl">
                 <Scanner onScanSuccess={(text) => { setDeviceSn(text); setShowScanner(false); }} />
                 <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-medium">取消扫描</button>
              </div>
            )}

            <button type="submit" id="btn_submit" disabled={isSubmitting} className="primary-btn mt-auto">
              {isSubmitting ? '上报中...' : '上报巡检信息'}
            </button>
          </form>
        </section>

        {/* Module 2: Setup QR */}
        <NetworkConfig />

        {/* Module 3: Monitor */}
        <Monitor deviceSn={deviceSn} setDeviceSn={setDeviceSn} />

      </main>
    </div>
  );
}
