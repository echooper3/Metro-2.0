import React, { useState } from 'react';
import { Share2, Mail, Twitter, Facebook, Link, Check, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EventActivity } from '../types';

interface EventShareProps {
  event: EventActivity;
}

const EventShare: React.FC<EventShareProps> = ({ event }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = window.location.origin + '?event=' + event.id;
  const shareText = `Check out "${event.title}" on Inside The Metro!`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareLinks = [
    {
      name: 'Direct Relay',
      icon: Link,
      color: 'bg-gray-100 text-gray-900',
      action: copyToClipboard,
      active: copied
    },
    {
      name: 'X Protocol',
      icon: Twitter,
      color: 'bg-[#1DA1F2] text-white',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      name: 'FB Network',
      icon: Facebook,
      color: 'bg-[#1877F2] text-white',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      name: 'Email Transmit',
      icon: Mail,
      color: 'bg-black text-white',
      action: () => window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`I thought you might be interested in this event:\n\n${event.title}\n${event.description}\n\nView more details here: ${shareUrl}`)}`
    }
  ];

  return (
    <div className="pt-8 mt-12 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
          <Share2 className="w-4 h-4" />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Intelligence Relay Suite</h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shareLinks.map((link) => (
          <motion.button
            key={link.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={link.action}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${link.color}`}
          >
            <div className="flex-shrink-0">
              {link.active ? <Check className="w-4 h-4" /> : <link.icon className="w-4 h-4" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight truncate">
              {link.active ? 'Signals Locked' : link.name}
            </span>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <Send className="w-3 h-3 text-gray-400 rotate-[-45deg]" />
          <span className="text-[9px] font-bold text-gray-400 uppercase truncate">
            {shareUrl}
          </span>
        </div>
        <button 
          onClick={copyToClipboard}
          className="text-orange-600 text-[9px] font-black uppercase tracking-widest hover:text-orange-700 whitespace-nowrap"
        >
          {copied ? 'Copied' : 'Fast Copy'}
        </button>
      </div>
    </div>
  );
};

export default EventShare;
