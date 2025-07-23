export default function LoginLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-[#FF5B5B]">
            <div className="h-full w-full">
              {/* Hero content */}
              <div className="relative z-20 flex items-center text-lg font-medium p-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-6 w-6"
                >
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                </svg>
                Your App Name
              </div>
              <div className="relative z-20 mt-auto p-8">
                <blockquote className="space-y-2">
                  <p className="text-lg">
                    &ldquo;Smart management board! There's a new bar for owner. Now you can empower your team and drive your business with.&rdquo;
                  </p>
                  <footer className="text-sm">Start 14 day full-featured trial. No credit card required</footer>
                </blockquote>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2">
              <a href="/" className="flex items-center text-sm font-medium text-muted-foreground mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back to Home
              </a>
              <h1 className="text-2xl font-semibold tracking-tight text-center">Login</h1>
              <p className="text-sm text-muted-foreground text-center">
                Start 14 day full-featured trial. No credit card required
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  } 