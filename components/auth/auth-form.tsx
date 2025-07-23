"use client";

import type React from "react";
import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmail, signup, signInWithGoogle, signInWithGithub } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github } from "lucide-react";

export function AuthForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  useEffect(() => {
    // Set active tab based on URL parameter
    const tab = searchParams.get("tab");
    if (tab === "signup") {
      setActiveTab("signup");
    }

    // Handle error from callback
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_callback_error") {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleSignIn = async (formData: FormData) => {
    setError(null);
    setMessage(null);
    formData.append('redirectTo', redirectTo);
    startTransition(async () => {
      const result = await signInWithEmail(formData);
      if (result?.error) {
        setError(result.error);
      }
      if (result?.message) {
        setMessage(result.message);
      }
    });
  };

  const handleSignup = async (formData: FormData) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
      if (result?.message) {
        setMessage(result.message);
      }
    });
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if ('error' in result) {
        setError(result.error);
      }
    });
  };

  const handleGithubSignIn = async () => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGithub();
      if ('error' in result) {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <CardHeader>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <CardDescription className="pt-4">
            {activeTab === "signin"
              ? "Enter your email to sign in"
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm">
              {message}
            </div>
          )}
          <TabsContent value="signin">
            <div className="grid gap-4">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                onClick={handleGithubSignIn}
                disabled={isPending}
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
            <form action={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Sending link..." : "Send Magic Link"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <div className="grid gap-4">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                onClick={handleGithubSignIn}
                disabled={isPending}
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
            <form action={handleSignup} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </CardFooter>
      </Tabs>
    </Card>
  );
}
