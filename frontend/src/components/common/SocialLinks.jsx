import React from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SITE } from '../../config/site';

const NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: <FaFacebookF /> },
  { key: 'x', label: 'X (Twitter)', icon: <FaXTwitter /> },
  { key: 'instagram', label: 'Instagram', icon: <FaInstagram /> },
  { key: 'linkedin', label: 'LinkedIn', icon: <FaLinkedinIn /> },
  { key: 'youtube', label: 'YouTube', icon: <FaYoutube /> },
];

// Icons for the social links filled in config/site.js; nothing if none are.
const SocialLinks = ({ className = '', linkClassName = '' }) => {
  const links = NETWORKS.filter((network) => SITE.social[network.key]);
  if (links.length === 0) return null;
  return (
    <div className={`d-flex gap-3 ${className}`}>
      {links.map((network) => (
        <a key={network.key} href={SITE.social[network.key]} target="_blank" rel="noreferrer" aria-label={network.label} className={linkClassName}>
          {network.icon}
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;
