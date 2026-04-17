import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auto Broker | New Car Superstore",
    description:
        "Work with a dedicated auto broker from New Car Superstore. Tell us what you're looking for and we'll handle the search, negotiation, and paperwork.",
        };

        export default function AutoBrokerPage() {
          return (
              <main className="min-h-screen bg-white">
                    <section className="mx-auto max-w-3xl px-6 pt-16 pb-8 text-center">
                            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                                      Skip the dealership. Use our Auto Broker.
                                              </h1>
                                                      <p className="mt-4 text-lg text-gray-600">
                                                                Tell us what you&apos;re looking for and we&apos;ll handle the search,
                                                                          negotiation, and paperwork &mdash; at no cost to you.
                                                                                  </p>
                                                                                        </section>

                                                                                              <section className="mx-auto max-w-3xl px-6 pb-20">
                                                                                                      <div
                                                                                                                data-tf-live="01K7SRDG58FZK6GQ06ZMR2JMMH"
                                                                                                                          style={{ width: "100%", height: "600px" }}
                                                                                                                                  />
                                                                                                                                          <Script
                                                                                                                                                    src="//embed.typeform.com/next/embed.js"
                                                                                                                                                              strategy="afterInteractive"
                                                                                                                                                                      />
                                                                                                                                                                            </section>
                                                                                                                                                                                </main>
                                                                                                                                                                                  );
                                                                                                                                                                                  }
                                                                                                                                                                                  
