import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, Copy, Check, ExternalLink, Sparkles, ShieldCheck, 
  Tag, Compass, Calendar, Link2, DollarSign, FileText, CheckCircle2,
  Share2, ArrowRight
} from 'lucide-react';
import { buildTrackedUrl, slugifyCampaign } from '../utils/trackingUtils';

interface SponsorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSponsorName?: string;
  initialCity?: string;
  initialUrl?: string;
}

const SponsorOnboardingModal: React.FC<SponsorOnboardingModalProps> = ({
  isOpen,
  onClose,
  initialSponsorName = '',
  initialCity = 'tulsa',
  initialUrl = ''
}) => {
  const [businessName, setBusinessName] = useState(initialSponsorName);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [cityId, setCityId] = useState(initialCity || 'tulsa');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [destinationUrl, setDestinationUrl] = useState(initialUrl);
  const [promoCode, setPromoCode] = useState(() => {
    const slug = initialSponsorName ? slugifyCampaign(initialSponsorName).toUpperCase().slice(0, 8) : 'METRO';
    return `${slug}15`;
  });
  const [footTrafficOffer, setFootTrafficOffer] = useState('Show this screen for 10% off admission or first drink');
  const [notes, setNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Auto-generate tracked UTM Link in real time
  const trackedUrl = useMemo(() => {
    if (!destinationUrl) return '';
    return buildTrackedUrl(destinationUrl, {
      source: 'inside_the_metro',
      medium: 'sponsor_campaign',
      campaign: businessName || 'partner_promotion',
      content: cityId
    });
  }, [destinationUrl, businessName, cityId]);

  const handleCopyLink = () => {
    if (!trackedUrl) return;
    navigator.clipboard.writeText(trackedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyFullSummary = () => {
    const summary = `
=========================================
METRO 2.0 - SPONSOR ONBOARDING & ATTRIBUTION SHEET
=========================================

1. SPONSOR & CAMPAIGN DETAILS
-----------------------------------------
• Business Name: ${businessName || 'N/A'}
• Contact: ${contactName || 'N/A'} (${contactEmail || 'N/A'})
• Target Hub: ${cityId.toUpperCase()} Hub
• Flight Window: ${startDate} to ${endDate}

2. DIGITAL ATTRIBUTION & TRACKING LINK
-----------------------------------------
• Target URL: ${destinationUrl || 'N/A'}
• GA4 Auto-Tracked URL:
  ${trackedUrl || 'N/A'}
• Google Analytics 4 Attribution Parameters:
  - Source: inside_the_metro
  - Medium: sponsor_campaign
  - Campaign: ${slugifyCampaign(businessName)}
  - Content: ${cityId}

3. POINT OF SALE & IN-PERSON ATTRIBUTION
-----------------------------------------
• Dedicated Promo Code: ${promoCode || 'N/A'}
  (Track redemptions in Square, Toast, Shopify, or Eventbrite)
• In-Person Foot-Traffic Perk:
  "${footTrafficOffer || 'N/A'}"

4. REPORTING COMMITMENT
-----------------------------------------
✓ Metro logs Impressions, Outbound Clicks, and Click-Through Rate (CTR).
✓ Sponsor monitors GA4 Traffic Acquisition (Session source = inside_the_metro).
✓ Sponsor tracks Promo Code usage at checkout.
✓ Metro issues an Automated Monthly Performance Scorecard.

Generated via Inside The Metro Intelligence Platform
https://www.inside-the-metro.com
=========================================
`.trim();

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
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
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-gray-50/50 print:bg-white print:border-b-2 print:border-black">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xl shadow-black/10 shrink-0">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-600">Attribution Protocol</span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[8px] font-black uppercase tracking-widest">GA4 Ready</span>
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mt-0.5">
                  Sponsor Onboarding & Traffic Agreement
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                title="Print Onboarding Sheet"
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

          {/* Form / Sheet Body */}
          <div className="p-8 overflow-y-auto space-y-8 print:p-0 print:overflow-visible">
            {/* Section 1: Business Info */}
            <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                <Compass className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">1. Partner & Campaign Flight Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Sponsor / Business Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Tulsa Arts Festival"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Target Metro Hub *</label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  >
                    <option value="general">General / All Hubs</option>
                    <option value="tulsa">Tulsa Hub</option>
                    <option value="okc">Oklahoma City Hub</option>
                    <option value="dallas">Dallas Hub</option>
                    <option value="houston">Houston Hub</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Contact Person</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="partner@business.com"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Campaign Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Campaign End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Traffic Attribution & Live UTM Generator */}
            <div className="bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 p-6 rounded-2xl border border-orange-200/70 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
                    2. Digital Attribution & GA4 Tracking URL
                  </h3>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  Auto-Tagged Link
                </span>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Destination Website or Ticket Link *
                  </label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://yourbusiness.com/tickets"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                </div>

                {/* Generated UTM Preview Box */}
                {destinationUrl && (
                  <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        Generated Tracked Link for Sponsor Campaign:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-1 bg-black hover:bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedLink ? 'Copied Link' : 'Copy Tracked URL'}
                      </button>
                    </div>

                    <p className="font-mono text-xs text-orange-950 break-all bg-orange-50/60 p-3 rounded-lg border border-orange-100 select-all">
                      {trackedUrl}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[9px] font-bold text-gray-500">
                      <div><span className="text-gray-400">Source:</span> inside_the_metro</div>
                      <div><span className="text-gray-400">Medium:</span> sponsor_campaign</div>
                      <div><span className="text-gray-400">Campaign:</span> {slugifyCampaign(businessName)}</div>
                      <div><span className="text-gray-400">Content:</span> {cityId}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Point-of-Sale & In-Person Attribution */}
            <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100 space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                <Tag className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
                  3. In-Person & Point-of-Sale (POS) Conversion Setup
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Dedicated Checkout / POS Promo Code
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. METRO15"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-black text-gray-900 uppercase tracking-widest focus:outline-none focus:border-black font-mono"
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    Provide this code to your register staff or add it to Square, Toast, or Shopify to track direct customer sales.
                  </p>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Foot-Traffic "Show This Screen" In-Store Perk
                  </label>
                  <input
                    type="text"
                    value={footTrafficOffer}
                    onChange={(e) => setFootTrafficOffer(e.target.value)}
                    placeholder="e.g. Show Metro app for 10% off"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    Displayed on your Metro banner or event card for walk-in attribution.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Mutual Reporting Agreement */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 space-y-3 text-left">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">
                  4. Traffic Verification & Monthly Reporting Protocol
                </h4>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Metro Provides:</strong> Monthly verified Impression count, Outbound Click count, and Click-Through Rate (CTR) via the automated scorecards.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Sponsor Verifies:</strong> Google Analytics 4 → Acquisition → Traffic Acquisition → Filter by Session source = <code>inside_the_metro</code>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Sponsor Reports:</strong> Total promo code redemptions using <code>{promoCode || 'METRO'}</code> at end of billing cycle.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Inside The Metro Intelligence • Partner Attribution Protocol
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyFullSummary}
                className="flex-1 sm:flex-initial px-5 py-3 bg-white border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-900 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                {copiedSummary ? 'Copied Client Agreement!' : 'Copy Agreement to Email'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-3 bg-black hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SponsorOnboardingModal;
