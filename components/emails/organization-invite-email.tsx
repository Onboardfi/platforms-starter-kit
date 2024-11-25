// components/emails/organization-invite-email.tsx

import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
  } from '@react-email/components';
  
  interface InviteEmailProps {
    inviterName: string;
    organizationName: string;
    inviteLink: string;
    expiresAt: Date;
  }
  
  export const OrganizationInviteEmail = ({
    inviterName,
    organizationName,
    inviteLink,
    expiresAt,
  }: InviteEmailProps) => {
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  
    return (
      <Html>
        <Head />
        <Preview>Join {organizationName} on Onboardfi</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={heading}>Join {organizationName}</Heading>
            
            <Text style={text}>
              Hi there,
            </Text>
            
            <Text style={text}>
              {inviterName} has invited you to join {organizationName} on Onboardfi.
            </Text>
            
            <Section style={buttonContainer}>
              <Link
                href={inviteLink}
                style={button}
              >
                Accept Invitation
              </Link>
            </Section>
            
            <Text style={text}>
              This invite will expire on {formattedExpiry}.
            </Text>
            
            <Hr style={hr} />
            
            <Text style={footer}>
              If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    );
  };
  
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '560px',
  };
  
  const heading = {
    fontSize: '24px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: '400',
    color: '#484848',
    padding: '17px 0 0',
  };
  
  const text = {
    fontSize: '15px',
    lineHeight: '1.4',
    color: '#3c4149',
    margin: '24px 0',
  };
  
  const buttonContainer = {
    padding: '27px 0 27px',
  };
  
  const button = {
    backgroundColor: '#000',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '15px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '11px 23px',
    maxWidth: '200px',
    margin: '0 auto',
  };
  
  const hr = {
    borderColor: '#dfe1e4',
    margin: '42px 0 26px',
  };
  
  const footer = {
    fontSize: '13px',
    lineHeight: '1.4',
    color: '#9ca299',
    margin: '12px 0',
  };
  
  export default OrganizationInviteEmail;