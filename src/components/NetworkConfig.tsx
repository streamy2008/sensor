import { Eye, EyeOff, QrCode } from 'lucide-react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function NetworkConfig() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('WPA2-PSK (AES)');
  const [showPassword, setShowPassword] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const generateQRCodeStr = () => {
    return `WIFI:T:${encryption.split('-')[0]};S:${ssid};P:${password};H:false;;`;
  };

  return (
    <section className="glass-card">
      <h2>网络配网设置</h2>
      
      <div className="flex flex-col flex-1">
        <div className="form-group">
          <label htmlFor="wifi_ssid">手机热点（ SSID）</label>
          <input
            type="text"
            id="wifi_ssid"
            className="form-input"
            placeholder="Clinical_Guest_5G"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="wifi_password">热点密码</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="wifi_password"
              className="form-input pr-10"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="enc_type">加密方式</label>
          <select
            id="enc_type"
            className="form-input appearance-none bg-transparent"
            value={encryption}
            onChange={(e) => setEncryption(e.target.value)}
          >
            <option>WPA2-PSK (AES)</option>
            <option>WPA3-SAE</option>
            <option>Open Network</option>
          </select>
        </div>

        <div className="text-center mt-2.5">
          {showQR ? (
             <div className="bg-white p-4 inline-block rounded-[12px] shadow-sm mb-2">
                 <QRCodeSVG value={generateQRCodeStr()} size={110} level="H" />
             </div>
          ) : (
            <div className="qr-placeholder text-white font-medium text-sm p-4 text-center leading-relaxed">
              中继器<br/>配网二维码
            </div>
          )}
          <p className="text-[11px] text-[#86868B] mt-2">向硬件摄像头展示二维码以完成配置</p>
        </div>

        <button
          onClick={() => setShowQR(!showQR)}
          className="primary-btn mt-6"
        >
          {showQR ? '隐藏二维码' : '生成中继器配网二维码'}
        </button>
      </div>
    </section>
  );
}
