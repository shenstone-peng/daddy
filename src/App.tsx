import React, { useState } from 'react';
import { CheckCircle2, Sparkles, LayoutGrid, ChevronRight, UserCircle2, Calendar, Camera, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="flex flex-col h-screen w-full max-w-[430px] mx-auto bg-[var(--color-ios-bg)] text-[var(--color-ios-text)] relative overflow-hidden font-sans">
      
      {/* iOS Status Bar Area & Large Title */}
      <header className="px-5 pt-14 pb-4 bg-[var(--color-ios-bg)] z-20">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[13px] font-semibold text-[var(--color-ios-text-secondary)] uppercase tracking-tight">2026年3月6日 星期五</span>
          <button className="text-[var(--color-ios-blue)]">
            <UserCircle2 className="w-8 h-8" strokeWidth={1.2} />
          </button>
        </div>
        <div className="flex justify-between items-end">
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === 'summary' ? '摘要' : activeTab === 'interpret' ? 'AI 解读' : '清单'}
          </h1>
          {activeTab === 'summary' && (
            <div className="flex items-center gap-3 bg-white/50 px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
              <div className="flex flex-col items-end">
                <span className="text-[13px] font-bold leading-none">第 24 周</span>
                <span className="text-[10px] text-[var(--color-ios-text-secondary)] font-medium">还有 112 天</span>
              </div>
              {/* Progress Ring */}
              <div className="relative w-8 h-8">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-black/5"
                    strokeDasharray="100, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-[var(--color-ios-blue)]"
                    strokeDasharray="60, 100"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[var(--color-ios-blue)] rounded-full shadow-[0_0_4px_var(--color-ios-blue)]"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pb-32 z-10">
        
        {activeTab === 'summary' && (
          <div className="space-y-8">
            {/* Today's Focus Card */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-[20px] font-bold">今日重点</h2>
                <button className="text-[15px] text-[var(--color-ios-blue)] font-medium">编辑</button>
              </div>
              <div className="ios-card p-5 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[var(--color-ios-blue)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold">陪老婆去建档</span>
                    <span className="text-[14px] text-[var(--color-ios-text-secondary)]">上午 09:30 · 市妇幼保健院</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--color-ios-text-secondary)] group-active:translate-x-1 transition-transform" />
              </div>
            </section>

            {/* Grouped Lists */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              
              {/* This Week Group */}
              <div>
                <h2 className="text-[20px] font-bold mb-3 px-1">本周必须</h2>
                <div className="ios-card overflow-hidden">
                  <div className="divide-y divide-black/5">
                    {[
                      { title: '预约四维彩超', time: '周三前完成', icon: '🏥' },
                      { title: '组装婴儿床', time: '周末空闲时间', icon: '🛏️' },
                      { title: '补充叶酸/钙片', time: '每日提醒', icon: '💊' }
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl w-8 text-center">{item.icon}</span>
                          <div className="flex flex-col">
                            <span className="text-[16px] font-semibold">{item.title}</span>
                            <span className="text-[13px] text-[var(--color-ios-text-secondary)]">{item.time}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--color-ios-text-secondary)] opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Future Prep Group */}
              <div>
                <h2 className="text-[20px] font-bold mb-3 px-1">后续准备</h2>
                <div className="ios-card overflow-hidden">
                  <div className="divide-y divide-black/5">
                    {[
                      { title: '月子中心实地考察', time: '下周六', icon: '🏢' },
                      { title: '学习新生儿洗澡', time: '第 28 周开始', icon: '🛁' },
                      { title: '准备待产包：证件类', time: '第 32 周前', icon: '🎒' }
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl w-8 text-center">{item.icon}</span>
                          <div className="flex flex-col">
                            <span className="text-[16px] font-semibold">{item.title}</span>
                            <span className="text-[13px] text-[var(--color-ios-text-secondary)]">{item.time}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--color-ios-text-secondary)] opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'interpret' && (
          <div className="h-full flex flex-col animate-in fade-in duration-700">
            {/* Main Action Area */}
            <section className="flex-1 flex flex-col items-center justify-center py-12">
              <button className="group flex flex-col items-center gap-4 p-8 bg-blue-50 rounded-[32px] active:scale-95 transition-all duration-300 shadow-sm border border-blue-100/50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-active:shadow-inner">
                  <Camera className="w-8 h-8 text-[var(--color-ios-blue)]" strokeWidth={1.5} />
                </div>
                <span className="text-[17px] font-semibold text-[var(--color-ios-blue)] tracking-tight">扫描产检报告</span>
              </button>
              <p className="mt-8 text-[14px] text-[var(--color-ios-text-secondary)] text-center max-w-[240px] leading-relaxed">
                AI 将为您解读报告中的专业术语，提供科学的建议。
              </p>
            </section>

            {/* Results Presentation (iOS Notification Style Cards) */}
            <section className="space-y-4 mb-12">
              <h2 className="text-[13px] font-semibold text-[var(--color-ios-text-secondary)] uppercase tracking-widest px-1 mb-2">最近分析</h2>
              
              <div className="ios-card p-4 flex flex-col gap-1 shadow-sm border-black/[0.02]">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[var(--color-ios-blue)] rounded-[4px] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[12px] font-bold text-[var(--color-ios-text-secondary)] uppercase tracking-tighter">AI 分析结果</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ios-text-secondary)]">刚刚</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[17px] font-bold">胎位：头位</span>
                  <p className="text-[14px] text-[var(--color-ios-text-secondary)] leading-snug mt-1">
                    这是最理想的分娩姿势，不用担心。
                  </p>
                </div>
              </div>

              <div className="ios-card p-4 flex flex-col gap-1 shadow-sm border-black/[0.02] opacity-80">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[var(--color-ios-blue)] rounded-[4px] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[12px] font-bold text-[var(--color-ios-text-secondary)] uppercase tracking-tighter">AI 分析结果</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ios-text-secondary)]">昨天</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[17px] font-bold">羊水指数：14.5cm</span>
                  <p className="text-[14px] text-[var(--color-ios-text-secondary)] leading-snug mt-1">
                    数值处于正常范围（8-18cm），继续保持水分摄入。
                  </p>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <footer className="pb-4 flex items-center justify-center gap-1.5 opacity-40">
              <Info className="w-3 h-3" />
              <span className="text-[10px] tracking-tight">AI 建议仅供参考，不作为医疗诊断依据</span>
            </footer>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="animate-in fade-in duration-500">
            {/* Placeholder for Tools/Checklist tab */}
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[var(--color-ios-blue)]" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold">清单管理</h2>
              <p className="text-[15px] text-[var(--color-ios-text-secondary)] mt-2">更多功能正在开发中...</p>
            </div>
          </div>
        )}
      </main>

      {/* Glassmorphism Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl border-t border-black/5 flex items-start justify-around px-2 pt-3 pb-8 z-30">
        <button 
          onClick={() => setActiveTab('summary')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${activeTab === 'summary' ? 'text-[var(--color-ios-blue)]' : 'text-[var(--color-ios-text-secondary)]'}`}
        >
          <div className="relative">
            <LayoutGrid className="w-7 h-7" strokeWidth={activeTab === 'summary' ? 2.5 : 1.5} />
            {activeTab === 'summary' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>}
          </div>
          <span className="text-[10px] font-bold">摘要</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('interpret')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${activeTab === 'interpret' ? 'text-[var(--color-ios-blue)]' : 'text-[var(--color-ios-text-secondary)]'}`}
        >
          <Sparkles className="w-7 h-7" strokeWidth={activeTab === 'interpret' ? 2.5 : 1.5} />
          <span className="text-[10px] font-bold">解读</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('tools')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${activeTab === 'tools' ? 'text-[var(--color-ios-blue)]' : 'text-[var(--color-ios-text-secondary)]'}`}
        >
          <CheckCircle2 className="w-7 h-7" strokeWidth={activeTab === 'tools' ? 2.5 : 1.5} />
          <span className="text-[10px] font-bold">清单</span>
        </button>
      </nav>
    </div>
  );
}
