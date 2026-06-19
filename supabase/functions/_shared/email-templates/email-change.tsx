/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração de e-mail no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={siteName} width="64" height="64" style={logo} />
        </Section>
        <Heading style={h1}>Confirme seu novo e-mail</Heading>
        <Text style={text}>
          Você pediu para alterar o e-mail da sua conta no <strong>{siteName}</strong>{' '}
          de{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Confirmar alteração
          </Button>
        </Section>
        <Text style={smallText}>Se o botão não funcionar, use este endereço:</Text>
        <Text style={linkFallback}>
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Se você não solicitou esta alteração, proteja sua conta trocando a senha
          imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const smallText = { fontSize: '13px', color: '#576B5D', lineHeight: '1.5', margin: '0 0 8px' }
const linkFallback = {
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
}
const link = { color: '#1D9A51', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1D9A51',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E3EBE5', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#9CA3AF', lineHeight: '1.5', margin: '0' }
