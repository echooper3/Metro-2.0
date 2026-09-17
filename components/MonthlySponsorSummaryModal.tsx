import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, Copy, Check, Eye, MousePointerClick, Percent, 
  BarChart3, Award, TrendingUp, ShieldCheck, Calendar, MapPin, 
  ExternalLink, Sparkles, Building
} from 'lucide-react';
import { formatCtr, getCtrBenchmark, buildTrackedUrl, slugifyCampaign } from '../utils/trackingUtils';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta: string;
  image: string;
  url: string;
  tag: string;
  cityId: string;
  clicks: number;
  impressions: number;
}

interface MonthlySponsorSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ads: Ad[];
  initialSelectedAdId?: string;
}

const MonthlySponsorSummaryModal: React.FC<MonthlySponsorSummaryModalProps> = ({
  isOpen,
  onClose,
  ads,
  initialSelectedAdId
}) => {
  const [selectedAdId, setSelectedAdId] = useState<string>(() => {
    if (initialSelectedAdId) return initialSelectedAdId;
    return ads.length > 0 ? ads[0].id : 'all';
  });

  const [reportingPeriod, setReportingPeriod] = useState(() => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync selectedAdId if initialSelectedAdId changes
  React.useEffect(() => {
    if (initialSelectedAdId) {
      setSelectedAdId(initialSelectedAdId);
    } else if (ads.length > 0 && selectedAdId !== 'all' && !ads.some(a => a.id === selectedAdId)) {
      setSelectedAdId(ads[0].id);
    }
  }, [initialSelectedAdId, ads]);

  // Compute selected data or aggregate
  const reportData = useMemo(() => {
    if (selectedAdId === 'all') {
      const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions || 0), 0);
      const totalClicks = ads.reduce((sum, a) => sum + (a.clicks || 0), 0);
      const ctr = formatCtr(totalClicks, totalImpressions);
      const benchmark = getCtrBenchmark(parseFloat(ctr));

      return {
        title: 'All Active Sponsor Placements (Portfolio Aggregate)',
        tag: 'Network Wide',
        cityId: 'Regional Network',
        url: 'https://www.inside-the-metro.com',
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr,
        benchmark,
        isAggregate: true
      };
    }

    const currentAd = ads.find(a => a.id === selectedAdId);
    if (!currentAd) {
      return {
        title: 'Select a Sponsor',
        tag: 'Sponsorship',
        cityId: 'General',
        url: '',
        impressions: 0,
        clicks: 0,
        ctr: '0.0',
        benchmark: getCtrBenchmark(0),
        isAggregate: false
      };
    }

    const impressions = currentAd.impressions || 0;
    const clicks = currentAd.clicks || 0;
    const ctr = formatCtr(clicks, impressions);
    const benchmark = getCtrBenchmark(parseFloat(ctr));

    return {
      title: currentAd.title,
      tag: currentAd.tag,
      cityId: currentAd.cityId,
      url: currentAd.url,
      impressions,
      clicks,
      ctr,
      benchmark,
      isAggregate: false
    };
  }, [ads, selectedAdId]);

  const handleCopyEmailReport = () => {
    const emailText = `
Subject: Your Monthly Metro Performance Report - ${reportData.title} (${reportingPeriod})

Hi there,

Here is your monthly traffic and campaign attribution summary for ${reportData.title} on Inside The Metro for ${reportingPeriod}:

CAMPAIGN PERFORMANCE SUMMARY:
• Target Hub: ${reportData.cityId.toUpperCase()} Hub
• Total Impressions: ${reportData.impressions.toLocaleString()} views
• Direct Website Clicks: ${reportData.clicks.toLocaleString()} clicks
• Click-Through Rate (CTR): ${reportData.ctr}% (${reportData.benchmark.label})
• Benchmark Insight: ${reportData.benchmark.description}

HOW TO VERIFY IN YOUR GOOGLE ANALYTICS (GA4):
1. Sign in to your Google Analytics 4 property.
2. Go to Reports → Acquisition → Traffic acquisition.
3. In the search box or primary dimension, filter by: Session source = "inside_the_metro".
4. You will see direct session counts, engagement duration, and any event conversions driven to your site.

POINT OF SALE & FOOT TRAFFIC:
If you are running an in-store promo or ticket code with us, please review redemptions across Square, Toast, or your ticketing provider for this period.

Thank you for being a valued partner with Inside The Metro!

Best regards,
Inside The Metro Intelligence Team
https://www.inside-the-metro.com
`.trim();

    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:overflow-visible">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md print:hidden"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 my-auto z-10 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        >
          {/* Header */}
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-white to-gray-50/50 print:bg-white print:border-b-2 print:border-black">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xl shadow-black/10 shrink-0">
                <BarChart3 className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-600">Performance Intelligence</span>
                  <span className="px-2.5 py-0.5 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest">{reportingPeriod}</span>
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mt-0.5">
                  Monthly Sponsor Traffic Summary
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                title="Print Report"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-black rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar (Print Hidden) */}
          <div className="px-8 py-5 bg-gray-50/80 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Building className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 sm:w-72">
                <select
                  value={selectedAdId}
                  onChange={(e) => setSelectedAdId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-black uppercase tracking-wide text-gray-900 focus:outline-none focus:border-black"
                >
                  <option value="all">📊 All Sponsors (Network Aggregate)</option>
                  {ads.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.title} ({ad.cityId.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="e.g. September 2026"
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Scorecard Body */}
          <div className="p-8 overflow-y-auto space-y-8 print:p-0 print:overflow-visible">
            {/* Sponsor Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">
                  {reportData.tag}
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900">{reportData.title}</h3>
                {reportData.url && (
                  <a 
                    href={reportData.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-gray-400 hover:text-black transition-colors flex items-center gap-1.5 mt-1 truncate max-w-md"
                  >
                    <span>{reportData.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">Placement Zone</span>
                  <span className="text-sm font-black text-gray-900 uppercase">{reportData.cityId} Hub</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs">
                  {reportData.cityId.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Impressions */}
              <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2 text-left">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">Delivered Impressions</span>
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-4xl font-black text-gray-900 tracking-tight italic">
                  {reportData.impressions.toLocaleString()}
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Verified screen views across metropolitan app feeds</p>
              </div>

              {/* Direct Clicks */}
              <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2 text-left">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">Outbound Clicks</span>
                  <MousePointerClick className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-4xl font-black text-orange-600 tracking-tight italic">
                  {reportData.clicks.toLocaleString()}
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Direct visitors routed to your landing & booking page</p>
              </div>

              {/* CTR & Benchmark */}
              <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2 text-left">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">Click-Through Rate</span>
                  <Percent className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-gray-900 tracking-tight italic">{reportData.ctr}%</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${reportData.benchmark.badgeColor}`}>
                    {reportData.benchmark.label}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">{reportData.benchmark.description}</p>
              </div>
            </div>

            {/* Verification Instructions for Sponsor */}
            <div className="p-6 bg-gradient-to-br from-gray-50 via-white to-orange-50/20 rounded-2xl border border-gray-200 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">
                  Google Analytics 4 (GA4) Cross-Verification Instructions
                </h4>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                All traffic driven by Inside The Metro contains standardized UTM attribution tokens. Your web analytics team can independently verify these sessions:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Step 1: Open GA4 Acquisition</span>
                  <p className="font-bold text-gray-800">Reports → Acquisition → Traffic acquisition</p>
                  <p className="text-[10px] text-gray-500">Filter your primary dimension by <code>Session source / medium</code>.</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Step 2: Filter Metro Source</span>
                  <p className="font-bold text-orange-950 font-mono">inside_the_metro / sponsor_campaign</p>
                  <p className="text-[10px] text-gray-500">Inspect total new users, engagement rate, and key conversion events.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Inside The Metro Intelligence • Monthly Partner Report
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyEmailReport}
                className="flex-1 sm:flex-initial px-5 py-3 bg-white border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-900 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                {copiedEmail ? 'Copied Client Email!' : 'Copy Email Summary to Client'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-3 bg-black hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Scorecard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MonthlySponsorSummaryModal;
