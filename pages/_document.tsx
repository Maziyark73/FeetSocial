import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="theme-color" content="#7c3aed" />
        <meta name="description" content="FeetSocial - Creator-first social platform" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body className="bg-gray-900 text-white antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

