import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel?: () => void; // 新增取消回调
}

export function Scanner({ onScanSuccess, onCancel }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning) return;
    
    // 初始化扫码器实例，优化了扫描框的比例
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true // 记住上次使用的摄像头（通常是后置）
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // 扫码成功：清理画布、关闭扫描状态、将数据传回 App.tsx
        scanner.clear();
        setIsScanning(false);
        onScanSuccess(decodedText);
      },
      (error) => {
        // 持续扫描中未对准二维码时的报错，直接忽略即可
      }
    );

    // 组件卸载时安全清理摄像头资源
    return () => {
      scanner.clear().catch(e => console.error("清理扫码器失败", e));
    };
  }, [isScanning, onScanSuccess]);

  if (!isScanning) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full my-4 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between w-full max-w-sm mb-3 px-2">
        <span className="text-[13px] font-bold text-[#86868B]">请将摄像头对准中继器设备标签</span>
        {/* 取消按钮，提升用户体验 */}
        <button 
          onClick={() => {
            setIsScanning(false);
            if(onCancel) onCancel();
          }}
          className="text-[13px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-full active:scale-95 transition-transform"
        >
          取消扫描
        </button>
      </div>
      
      {/* 扫码框 UI 优化：加入苹果风格的大圆角和阴影 */}
      <div 
        id="reader" 
        className="w-full max-w-sm mx-auto overflow-hidden rounded-[24px] border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white"
      ></div>
      
      {/* 覆盖 html5-qrcode 默认丑陋按钮的补丁样式 */}
      <style>{`
        #reader__dashboard_section_csr span { display: none; }
        #reader__dashboard_section_csr button {
          background: #007AFF; color: white; border: none; border-radius: 8px; padding: 6px 12px; font-weight: bold; margin-top: 10px; cursor: pointer;
        }
        #reader__dashboard_section_swaplink { text-decoration: none; color: #007AFF; font-weight: bold; margin-top: 10px; display: inline-block; }
      `}</style>
    </div>
  );
}