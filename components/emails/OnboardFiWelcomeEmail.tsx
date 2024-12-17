import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
  } from "@react-email/components";
  import * as React from "react";
  
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";
  
  interface WelcomeEmailProps {
    firstName?: string;
    organizationName?: string;
  }
  
  export const OnboardFiWelcomeEmail = ({ 
    firstName = "there",
    organizationName = "your organization"
  }: WelcomeEmailProps) => (
    <Html>
      <Head />
      <Preview>Welcome to OnboardFi - Your AI-Powered Customer Onboarding Platform</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            {/* Header Logo */}
            <Img
              src={`${baseUrl}/onboardfi-logo-q4.png`}
              width="180"
              height="40"
              alt="OnboardFi"
              style={logo}
            />
            
            <Hr style={hr} />
            
            {/* Mascot Image */}
            <Img
              src={`${baseUrl}/astro.png`}
              width="120"
              height="120"
              alt="OnboardFi Mascot"
              style={mascot}
            />
  
            <Text style={heading}>Welcome aboard, {firstName}! 🚀</Text>
  
            <Text style={paragraph}>
              We're thrilled to have you and {organizationName} join the OnboardFi community. You're now ready to revolutionize your customer onboarding experience with AI-powered automation!
            </Text>
  
            <Text style={paragraph}>
              With OnboardFi, you can now:
            </Text>
  
            <Text style={listItem}>• Deploy intelligent AI agents for 24/7 customer assistance</Text>
            <Text style={listItem}>• Create dynamic, personalized onboarding experiences</Text>
            <Text style={listItem}>• Track engagement metrics in real-time</Text>
            <Text style={listItem}>• Scale your onboarding process effortlessly</Text>
  
            <Button style={button} href="https://app.onboardfi.com/dashboard">
              Go to Dashboard
            </Button>
  
            <Hr style={hr} />
  
            <Text style={paragraph}>
              Need help getting started? Check out our{" "}
              <Link style={anchor} href="https://docs.onboardfi.com">
                documentation
              </Link>{" "}
              or schedule a{" "}
              <Link style={anchor} href="https://calendly.com/onboardfi">
                quick onboarding call
              </Link>{" "}
              with our team.
            </Text>
  
            <Text style={paragraph}>
              We're here to ensure you get the most out of OnboardFi. Don't hesitate to reach out to our support team at{" "}
              <Link style={anchor} href="mailto:support@onboardfi.com">
                support@onboardfi.com
              </Link>
            </Text>
  
            <Text style={paragraph}>Welcome to the future of customer onboarding!</Text>
  
            <Text style={signoff}>— The OnboardFi Team</Text>
  
            <Hr style={hr} />
  
            <Text style={footer}>
              OnboardFi, Inc. • Made with 💙 in San Francisco
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
  
  export default OnboardFiWelcomeEmail;
  
  const main = {
    backgroundColor: "#0A0A0A",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    backgroundColor: "#1A1A1A",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "16px",
  };
  
  const box = {
    padding: "0 48px",
  };
  
  const logo = {
    margin: "0 auto",
    marginBottom: "24px",
    display: "block",
  };
  
  const mascot = {
    margin: "0 auto",
    marginBottom: "32px",
    display: "block",
  };
  
  const hr = {
    borderColor: "#333",
    margin: "20px 0",
  };
  
  const heading = {
    color: "#FFFFFF",
    fontSize: "24px",
    lineHeight: "36px",
    textAlign: "center" as const,
    fontWeight: "bold",
    margin: "30px 0",
  };
  
  const paragraph = {
    color: "#A3A3A3",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginBottom: "16px",
  };
  
  const listItem = {
    color: "#A3A3A3",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginBottom: "8px",
    paddingLeft: "16px",
  };
  
  const anchor = {
    color: "#3B82F6",
    textDecoration: "none",
  };
  
  const button = {
    backgroundColor: "#3B82F6",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: "32px",
    marginBottom: "32px",
  };
  
  const signoff = {
    color: "#A3A3A3",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginTop: "32px",
    marginBottom: "32px",
  };
  
  const footer = {
    color: "#666666",
    fontSize: "12px",
    lineHeight: "16px",
    textAlign: "center" as const,
  };