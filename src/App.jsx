import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Barcode, 
  Trash2, 
  Printer, 
  FileSpreadsheet, 
  Settings, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Edit // 新增图标
} from 'lucide-react';

const AssetLabelApp = () => {
  // 状态管理
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('input'); // 'input' or 'viewer'
  const [notification, setNotification] = useState(null);
  const [libsLoaded, setLibsLoaded] = useState(false); // 追踪库是否加载完成
  
  const barcodeRef = useRef(null);
  const qrRef = useRef(null);

  // 初始化加载外部脚本 (JsBarcode 和 QRCode)
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"),
      loadScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js")
    ]).then(() => {
      setLibsLoaded(true);
      // 检查本地存储
      const savedData = localStorage.getItem('assetData');
      const savedRaw = localStorage.getItem('assetRawData'); // 同时也恢复原始文本
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.length > 0) {
            setParsedData(parsed);
            if (savedRaw) setRawData(savedRaw); // 恢复输入框内容
            setViewMode('viewer');
          }
        } catch (e) {
          console.error("Cache parsing error");
        }
      }
    }).catch(err => console.error("Script load error", err));
  }, []);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'viewer') return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, parsedData.length]);

  // 生成条形码和二维码
  useEffect(() => {
    if (viewMode === 'viewer' && parsedData[currentIndex] && libsLoaded) {
      const currentCode = parsedData[currentIndex].code;

      // 生成一维码 (Barcode)
      if (window.JsBarcode && barcodeRef.current) {
        try {
          window.JsBarcode(barcodeRef.current, currentCode, {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: false,
            margin: 0,
            background: "#ffffff",
            lineColor: "#000000"
          });
        } catch (error) {
          console.error("Barcode generation failed", error);
        }
      }

      // 生成二维码 (QR Code)
      if (window.QRCode && qrRef.current) {
        try {
          window.QRCode.toCanvas(qrRef.current, currentCode, {
            width: 90,
            margin: 0,
            color: {
              dark: "#000000",
              light: "#ffffff"
            }
          }, function (error) {
            if (error) console.error(error);
          });
        } catch (error) {
          console.error("QR generation failed", error);
        }
      }
    }
  }, [currentIndex, viewMode, parsedData, libsLoaded]);

  // 解析数据逻辑
  const processData = () => {
    if (!rawData.trim()) {
      showNotification('请先粘贴数据', 'error');
      return;
    }

    const rows = rawData.trim().split('\n');
    const validData = [];

    rows.forEach((row, index) => {
      const cols = row.split('\t');
      const cleanCols = cols.map(c => c.trim());

      if (index === 0 && (cleanCols[0].includes('编码') || cleanCols[0].includes('Code') || cleanCols[0] === '资产编码')) {
        return; 
      }

      if (cleanCols[0]) {
        validData.push({
          code: cleanCols[0],
          name: cleanCols[1] || '无名称',
          spec: cleanCols[2] || '无规格型号'
        });
      }
    });

    if (validData.length === 0) {
      showNotification('未能识别有效数据，请确保从Excel直接复制', 'error');
      return;
    }

    setParsedData(validData);
    setViewMode('viewer');
    setCurrentIndex(0);
    // 保存解析数据和原始文本
    localStorage.setItem('assetData', JSON.stringify(validData));
    localStorage.setItem('assetRawData', rawData);
    showNotification(`成功识别 ${validData.length} 条资产数据`, 'success');
  };

  const handleNext = () => {
    if (currentIndex < parsedData.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // 新增：返回编辑模式
  const handleEdit = () => {
    setViewMode('input');
    // 不清空 rawData，让用户可以修改
    showNotification('已返回编辑模式', 'info');
  };

  const resetApp = () => {
    if (window.confirm('确定要清空当前列表并返回输入界面吗？此操作不可恢复。')) {
      setParsedData([]);
      setRawData('');
      setViewMode('input');
      localStorage.removeItem('assetData');
      localStorage.removeItem('assetRawData');
      setCurrentIndex(0);
      showNotification('已清空所有数据', 'info');
    }
  };

  const printLabel = () => {
    window.print();
  };

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const progressPercent = parsedData.length > 0 
    ? ((currentIndex + 1) / parsedData.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-blue-100">
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            box-shadow: none;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 顶部通知 */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* 头部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Barcode className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">AssetTag <span className="text-gray-400 font-light text-sm">Pro</span></h1>
          </div>
          {viewMode === 'viewer' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={printLabel}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="打印当前标签"
              >
                <Printer size={20} />
              </button>
              
              {/* 新增：编辑按钮 */}
              <button 
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="返回修改数据"
              >
                <Edit size={20} />
              </button>

              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              <button 
                onClick={resetApp}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="清空并重新开始"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          )}
        </div>
        
        {viewMode === 'viewer' && (
          <div className="h-1 w-full bg-gray-100">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
        
        {/* 输入模式 */}
        {viewMode === 'input' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">粘贴 Excel 数据</h2>
              <p className="text-gray-500 text-sm">
                直接从 Excel 复制三列数据：资产编码、资产名称、规格型号。<br/>
                系统会自动识别并生成条形码与二维码。
              </p>
            </div>

            <div className="mb-6 relative">
              <textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder={`例：
ZC40-SH-0004	16T机械硬盘	16T机械硬盘 NAS用
ZC34-SH-0240	10.2寸 IPAD 64G	10.2寸 IPAD 64G`}
                className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none transition-all placeholder:text-gray-400"
              ></textarea>
              <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
                支持 Tab 分隔符
              </div>
            </div>

            <button
              onClick={processData}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Barcode size={20} />
              {parsedData.length > 0 ? '重新生成' : '开始识别生成'}
            </button>
          </div>
        )}

        {/* 浏览模式 */}
        {viewMode === 'viewer' && parsedData.length > 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            
            {/* 卡片容器 - 用于打印的类名 */}
            <div className="printable-area bg-white w-full max-w-md md:aspect-auto rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative transition-all duration-300">
              
              {/* 装饰背景 */}
              <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 no-print"></div>

              {/* 核心内容区 */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-10 text-center">
                
                <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4">ASSET TAG</h3>
                
                {/* 码区：双码并排布局 */}
                <div className="w-full mb-6 flex items-center justify-between gap-4 p-4 bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-200 transition-colors cursor-pointer" onClick={printLabel}>
                  
                  {/* 左侧：一维码 */}
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 pr-2">
                     <svg ref={barcodeRef} className="w-full h-auto max-h-[60px]"></svg>
                  </div>
                  
                  {/* 右侧：二维码 */}
                  <div className="flex-shrink-0 pl-2">
                     <canvas ref={qrRef} className="w-[90px] h-[90px]"></canvas>
                  </div>
                </div>

                {/* 详情区域 */}
                <div className="w-full space-y-5">
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asset Code</div>
                    <div className="text-3xl font-mono font-bold text-gray-900 break-all tracking-tight">
                      {parsedData[currentIndex].code}
                    </div>
                  </div>

                  <div className="w-full border-t border-gray-100"></div>

                  <div className="space-y-1 pt-2">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asset Name</div>
                    <div className="text-xl font-bold text-gray-800 leading-snug">
                      {parsedData[currentIndex].name}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-left">
                     <div className="flex items-start gap-2">
                        <div className="mt-1 min-w-[4px] h-[4px] rounded-full bg-blue-400"></div>
                        <div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Spec / Model</div>
                          <div className="text-sm text-gray-600 leading-relaxed font-medium">
                            {parsedData[currentIndex].spec}
                          </div>
                        </div>
                     </div>
                  </div>
                </div>

              </div>

              {/* 打印页脚 */}
              <div className="text-[10px] text-center text-gray-300 pb-4 hidden print:block">
                Generated by AssetTag Pro
              </div>
            </div>

          </div>
        )}
      </main>

      {/* 底部悬浮控制栏 */}
      {viewMode === 'viewer' && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 pb-6 no-print z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                currentIndex === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm active:scale-95'
              }`}
            >
              <ArrowLeft size={18} />
              <span className="hidden md:inline">上一个</span>
            </button>

            {/* 计数器与跳转 */}
            <div className="flex flex-col items-center justify-center min-w-[100px] cursor-pointer group"
                 onClick={() => {
                   const page = prompt(`跳转到页码 (1-${parsedData.length}):`, currentIndex + 1);
                   if (page && !isNaN(page)) {
                     const idx = parseInt(page) - 1;
                     if (idx >= 0 && idx < parsedData.length) setCurrentIndex(idx);
                   }
                 }}>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Asset Counter</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {currentIndex + 1}
                </span>
                <span className="text-sm text-gray-400">/ {parsedData.length}</span>
              </div>
            </div>

            <button 
              onClick={handleNext}
              disabled={currentIndex === parsedData.length - 1}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                currentIndex === parsedData.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95'
              }`}
            >
              <span className="hidden md:inline">下一个</span>
              <ArrowRight size={18} />
            </button>

          </div>
          
          <div className="text-center text-xs text-gray-400 mt-2">
            提示：可使用键盘 ← → 方向键快速切换
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetLabelApp;