import React from 'react';

export const FeatureGridSection: React.FC = () => {
  return (
    <div className="feature-grid-section">
      <h2>Feature Grid Section</h2>
      <p>Placeholder component for feature grid</p>
    </div>
  );
};

export const CtaSection: React.FC = () => {
  return (
    <div className="cta-section">
      <h2>Call to Action</h2>
      <p>Placeholder component for CTA</p>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  return (
    <div className="hero-section">
      <h1>Hero Section</h1>
      <p>Placeholder component for hero</p>
    </div>
  );
};

export const SectionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="section-wrapper">
      {children}
    </div>
  );
};