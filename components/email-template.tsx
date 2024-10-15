// app/components/email-template.tsx

import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333333' }}>
    <h1 style={{ color: '#2E86C1' }}>Welcome to 401 Financial, {firstName}!</h1>
    <p>
      We are thrilled to have you on board as a valued client. To ensure a smooth and efficient onboarding process, please complete the following steps:
    </p>
    
    <ul style={{ paddingLeft: '20px' }}>
      <li>
        <strong>Advisory Agreement:</strong> Please review and sign our{' '}
        <a href="#" style={{ color: '#2E86C1', textDecoration: 'none' }}>Advisory Agreement</a> to formalize our partnership.
      </li>
      <li>
        <strong>Kubera Account Setup:</strong> Set up your Kubera account to manage and monitor your investments by visiting{' '}
        <a href="#" style={{ color: '#2E86C1', textDecoration: 'none' }}>Kubera Account Setup</a>.
      </li>
      <li>
        <strong>Payment Processing:</strong> To facilitate seamless transactions, please set up your Stripe account through{' '}
        <a href="#" style={{ color: '#2E86C1', textDecoration: 'none' }}>Stripe Account Setup</a>.
      </li>
      <li>
        <strong>ADV Document:</strong> Familiarize yourself with our Advisers Declaration of Compliance by downloading the{' '}
        <a href="#" style={{ color: '#2E86C1', textDecoration: 'none' }}>ADV PDF</a>.
      </li>
    </ul>
    
    <p>
      If you have any questions or need assistance with any of the above steps, feel free to reach out to our support team at <a href="mailto:support@401financial.com" style={{ color: '#2E86C1', textDecoration: 'none' }}>support@401financial.com</a>.
    </p>
    
    <p>
      Welcome aboard! We look forward to helping you achieve your financial goals.
    </p>
    
    <p>Best regards,<br/>The 401 Financial Team</p>
    
    <hr style={{ border: 'none', borderTop: '1px solid #CCCCCC', margin: '20px 0' }} />
    
    <p style={{ fontSize: '12px', color: '#888888' }}>
      401 Financial<br/>
      1234 Financial Ave, Suite 100<br/>
      City, State, ZIP Code<br/>
      <a href="#" style={{ color: '#2E86C1', textDecoration: 'none' }}>Unsubscribe</a>
    </p>
  </div>
);
