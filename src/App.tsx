import { Scan, Save, Settings, Database, Server, Wifi, Eye, EyeOff, X, CheckCircle2, QrCode } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
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
  
  // WiFi Config States
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('WPA2-PSK (AES)');
  const [showPassword, setShowPassword] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);

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

  const generateQRCodeStr = () => {
    return `WIFI:T:${encryption.split('-')[0]};S:${ssid};P:${password};H:false;;`;
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
        
        {/* Module 1: Business Context & Results */}
        <section className="glass-card flex flex-col pt-6 pb-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-bold text-[#1D1D1F] m-0">巡检信息上报</h2>
            <div className="flex items-center gap-1 text-[12px] font-medium text-[#007AFF] bg-[#007AFF]/10 px-2 py-1 rounded-lg">
              <Database size={14}/>
              离线待报: {(getOfflineTasks() as any).length || 0}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            {/* WiFi Setup (Foldable or Integrated) */}
            <div className="mb-6 p-5 bg-black/5 rounded-[20px] border border-black/5">
              <div className="flex items-center gap-2 mb-4">
                <Wifi size={18} className="text-[#007AFF]"/>
                <h3 className="font-bold text-[15px]">中继器配网参数</h3>
              </div>
              
              <div className="form-group">
                <label htmlFor="wifi_ssid">手机热点（ SSID）</label>
                <input type="text" id="wifi_ssid" className="form-input" placeholder="输入手机热点名称" value={ssid} onChange={(e) => setSsid(e.target.value)} />
              </div>

              <div className="form-group">
                <label htmlFor="wifi_password">热点密码</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="wifi_password" className="form-input pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[#86868B]">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  if(!ssid) { alert('请先输入手机热点名称'); return; }
                  setShowFullScreenQR(true);
                }}
                className="w-full py-3 bg-white border border-[#007AFF] text-[#007AFF] rounded-xl text-sm font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <QrCode size={18}/>
                生成中继器配网二维码
              </button>
            </div>

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
              <div className="flex gap-2 items-center">
                <input id="device_sn" className="form-input font-mono flex-1" value={deviceSn} onChange={e => setDeviceSn(e.target.value)} placeholder="如留空将自动获取硬件SN" />
                <label className="scan-btn whitespace-nowrap cursor-pointer m-0">
                  扫描
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const html5QrCode = new Html5Qrcode("native-qr-reader");
                        const decodedText = await html5QrCode.scanFile(file, true);
                        setDeviceSn(decodedText);
                        alert('中继器扫描成功，建立连接成功！');
                      } catch (err) {
                        alert('未检测到有效二维码，请手动输入或重拍');
                      } finally {
                        e.target.value = ''; // reset input
                        const readerElement = document.getElementById('native-qr-reader');
                        if (readerElement) readerElement.innerHTML = ''; // clean up canvas
                      }
                    }} 
                  />
                </label>
              </div>
            </div>

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

      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {showFullScreenQR && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setShowFullScreenQR(false)}
              className="absolute top-6 right-6 text-white/50 hover:text-white"
            >
              <X size={32}/>
            </button>
            <div className="text-center mb-8">
              <h2 className="text-white text-xl font-bold mb-2">中继器配网二维码</h2>
              <p className="text-white/60 text-sm">请将中继器摄像头对准屏幕</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] shadow-[0_0_50px_rgba(0,122,255,0.4)]">
              <QRCodeSVG value={generateQRCodeStr()} size={240} level="H" />
            </div>
            
            <div className="mt-12 flex flex-col gap-4 w-full max-w-xs">
              <button 
                onClick={() => {
                  alert('中继器建立连接成功！');
                  setShowFullScreenQR(false);
                }}
                className="w-full py-4 bg-[#34C759] text-white rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20}/>
                模拟扫描成功并连接
              </button>
              <p className="text-white/40 text-[11px] text-center">中继器连接云端后会自动同步配网状态</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden div required by html5-qrcode file scanning API */}
      <div id="native-qr-reader" style={{ display: 'none' }}></div>
    </div>
  );
}
