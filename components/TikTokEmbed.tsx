import Script from 'next/script';

export default function TikTokEmbed() {
  return (
    <>
      <blockquote
        className="tiktok-embed"
        cite="https://www.tiktok.com/@scout2015/video/6718335390845095173"
        data-video-id="6718335390845095173"
        style={{ width: '325px', height: '575px' }}
      >
        <section>
          <a
            target="_blank"
            title="@scout2015"
            href="https://www.tiktok.com/@scout2015"
          >
            @scout2015
          </a>
        </section>
      </blockquote>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
    </>
  );
}
