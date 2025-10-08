import Head from 'next/head';

export default function Test() {
  return (
    <>
      <Head>
        <title>FeetSocial Test Page</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">FS</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            🎉 FeetSocial is Working!
          </h1>
          
          <p className="text-xl text-gray-300 mb-8">
            Your FeetSocial MVP is successfully running
          </p>
          
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-white mb-4">✅ What's Working:</h2>
            <ul className="text-left space-y-2 text-gray-300">
              <li>• Next.js 14 application</li>
              <li>• TailwindCSS styling</li>
              <li>• TypeScript configuration</li>
              <li>• All project files created</li>
              <li>• Development server running</li>
            </ul>
          </div>
          
          <div className="mt-8 space-y-4">
            <div className="text-sm text-gray-400">
              <p><strong>Next Steps:</strong></p>
              <p>1. Set up Supabase database (see database-schema.sql)</p>
              <p>2. Configure environment variables</p>
              <p>3. Test authentication and features</p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <a
                href="/"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Main App
              </a>
              <a
                href="/TESTING.md"
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                View Testing Guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

