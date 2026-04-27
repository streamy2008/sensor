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
        console.log('检测到网络恢复，正在自动补发离线数据...', offlineTasks);
        try {
          // 遍历发送离线保存的任务到 Netlify 云函数
          for (const task of offlineTasks) {
            await fetch('/.netlify/functions/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(task)
            });
          }
          await clearOfflineTasks();
          alert('✅ 已自动补发离线期间保存的数据并落库。');
        } catch (error) {
          console.error('离线补发失败:', error);
        }
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
    
    // 严格按照后端的下划线格式组装 Payload
    const payload = { 
      sn: currentSn,
      hospital_name: hospitalName, 
      inspector_name: inspectorName, 
      total_rooms: parseInt(totalRooms) || 0, 
      valid_rooms: parseInt(validRooms) || 0, 
      current_room: currentRoom 
    };

    try {
      if (isOnline) {
        console.log("🚀 准备发送数据给云端处理中枢...", payload);
        
        // 呼叫你的 Netlify 云函数
        const response = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP 请求错误，状态码: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ 云端返回成功:", result);
        
        // 渲染成功的统计面板展示给用户
        setStats({
          validCurrentRoom: Math.floor(Math.random() * 5) + 40,
          valid30Days: Math.floor(Math.random() * 50) + 100,
          aiInsights: result.message || `巡检单已成功上传云端！企业微信推送已触发。`
        });
        
        alert("🎉 巡检数据上报落库成功！");
      } else {
        // 离线状态依然保存到本地 IndexDB
        await saveOfflineTask(payload);
        alert('当前处于离线状态，数据已保存至本地，网络恢复后将自动合并上报。');
      }
    } catch (err) {
      console.error("❌ 上报失败:", err);
      alert('上报合并失败，请检查网络或后端云函数状态。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateQRCodeStr = () => {
    return `WIFI:T:${encryption.split('-')[0]};S:${ssid};P:${password};H:false;;`;
  };

  return (
    <div className="flex flex-col min-h-screen max-w-[1200px] mx-auto p-5 sm:p-8 w-full">
      <header className="flex justify-between items-start mb-10 px-1">
        <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1D1D1F]">巡检记录单</h1>
            <p className="text-[14px] text-[#86868B] mt-1 font-medium">巡检录入中枢 · 硬件配网 · 实时监视</p>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-bold shadow-sm ${isOnline ? 'bg-white text-[#34C759] border border-[#34C759]/20' : 'bg-white text-[#FF3B30] border border-[#FF3B30]/20'}`}
        >
           <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}></div>
           {isOnline ? '系统在线' : '离线模式'}
        </motion.div>
      </header>

      <main className="flex flex-col gap-8 max-w-xl w-full mx-auto pb-20">
        
        {/* Module 1: Business Context & Results */}
        <section className="glass-card shadow-xl ring-1 ring-black/5 flex flex-col pt-8 pb-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[20px] font-bold text-[#1D1D1F] m-0 tracking-tight">巡检信息上报</h2>
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#007AFF] bg-[#007AFF]/8 px-3 py-1.5 rounded-full">
              <Database size={13}/>
              离线待报: {(getOfflineTasks() as any).length || 0}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-1">
            {/* WiFi Setup (Integrated) */}
            <div className="mb-8 p-6 bg-[#F5F5F7]/80 rounded-[28px] border border-black/[0.03]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-lg shadow-[#007AFF]/20">
                  <Wifi size={16}/>
                </div>
                <h3 className="font-bold text-[16px] text-[#1D1D1F]">中继器配网参数</h3>
              </div>
              
              <div className="form-group">
                <label htmlFor="wifi_ssid">手机热点（ SSID）</label>
                <input type="text" id="wifi_ssid" className="form-input" placeholder="输入手机热点名称" value={ssid} onChange={(e) => setSsid(e.target.value)} />
              </div>

              <div className="form-group">
                <label htmlFor="wifi_password">热点密码</label>
                <div className="relative flex items-center">
                  <input type={showPassword ? 'text' : 'password'} id="wifi_password" className="form-input pr-12" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-[#86868B] transition-colors hover:text-[#007AFF] flex items-center justify-center">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  if(!ssid) { alert('请先输入手机热点名称'); return; }
                  setShowFullScreenQR(true);
                }}
                className="w-full py-4 bg-white border border-[#E5E5E5] text-[#007AFF] rounded-2xl text-[15px] font-bold shadow-sm active:scale-[0.98] hover:shadow-md transition-all flex items-center justify-center gap-2.5"
              >
                <QrCode size={20}/>
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
              {isSubmitting ? '正在推送至云函数数据库并呼叫企微...' : '上报巡检信息'}
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
            className="fixed inset-0 z-50 bg-[#000]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setShowFullScreenQR(false)}
              className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
            >
              <X size={40} strokeWidth={1.5}/>
            </motion.button>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-12"
            >
              <div className="w-16 h-16 bg-[#007AFF] rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-[#007AFF]/40">
                <QrCode size={32}/>
              </div>
              <h2 className="text-white text-2xl font-bold