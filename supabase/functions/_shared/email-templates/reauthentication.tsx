/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="E Aí Jogador" width="64" height="64" style={logo} />
        </Section>
        <Heading style={h1}>Código de verificação</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Este código expira em alguns minutos. Se você não solicitou, pode ignorar
          este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const LOGO_URL =
  'https://fbcviuapotdfenycjgtz.supabase.co/storage/v1/object/public/team-logos/email%2Flogo.png'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Nunito, "Helvetica Neue", Helvetica, Arial, sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
  backgroundColor: '#ffffff',
}
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { display: 'inline-block', borderRadius: '12px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 800 as const,
  color: '#26402E',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = { fontSize: '15px', color: '#576B5D', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '32px',
  fontWeight: 800 as const,
  letterSpacing: '6px',
  color: '#1D9A51',
  backgroundColor: '#F1F8F3',
  borderRadius: '12px',
  padding: '16px 0',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const hr = { borderColor: '#E3EBE5', margin: '12px 0 16px' }
const footer = { fontSize: '12px', color: '#9CA3AF', lineHeight: '1.5', margin: '0' }
