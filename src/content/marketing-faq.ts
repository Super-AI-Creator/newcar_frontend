/** Single FAQ pair — shared by on-page FAQ UI and FAQPage JSON-LD. */

export type MarketingFaqItem = { question: string; answer: string };

/** https://newcarsuperstore.com/ */
export const HOME_FAQ_ITEMS: MarketingFaqItem[] = [
  {
    question: "What is NewCarSuperstore?",
    answer:
      "NewCarSuperstore is an online car broker service that helps you shop, compare, and lease or buy new and used cars across California without visiting dealerships."
  },
  {
    question: "How does online car buying in Los Angeles work?",
    answer:
      "You can browse thousands of cars, compare offers, get pre-approved, and complete your purchase online. Your car is then delivered directly to your home."
  },
  {
    question: "Do you offer new car lease specials in California?",
    answer:
      "Yes, we provide the latest new car lease specials in California, including BMW, Mercedes, Kia, Toyota, Honda, and more at competitive monthly payments."
  },
  {
    question: "Can I buy a car without visiting a dealership in California?",
    answer:
      "Absolutely. Our service allows you to buy a car without a dealer visit. Everything from browsing to financing is handled online."
  },
  {
    question: "What is a car broker service in California?",
    answer:
      "A car broker service helps you find the best new car deals in California by comparing offers from multiple dealers and negotiating on your behalf."
  },
  {
    question: "Do you offer affordable car lease deals in Los Angeles?",
    answer:
      "Yes, we specialize in affordable car lease deals in Los Angeles and across Southern California with transparent pricing and no hidden fees."
  },
  {
    question: "Can I compare car lease offers online?",
    answer:
      "Yes, you can compare multiple car lease offers online in California to find the best deal based on your budget, make, and model preference."
  },
  {
    question: "Do you provide used car deals online in California?",
    answer:
      "Yes, we also help customers buy used cars online in California with verified listings and competitive pricing."
  },
  {
    question: "What areas do you serve in California?",
    answer:
      "We serve all major regions including Los Angeles, Orange County, Ventura County, and Santa Barbara for both new and used car deals."
  },
  {
    question: "Is financing available for online car purchases?",
    answer:
      "Yes, we offer fast online pre-approval options so you can easily finance your new or used car purchase in California."
  }
];

/** https://newcarsuperstore.com/lease-specials */
export const LEASE_SPECIALS_FAQ_ITEMS: MarketingFaqItem[] = [
  {
    question: "What are the best online lease specials in California?",
    answer:
      "We offer a wide range of online lease specials in California with live inventory, including deals on Toyota, Honda, BMW, Mercedes, and Kia vehicles."
  },
  {
    question: "How can I compare car lease offers in California?",
    answer:
      "You can easily compare car lease offers in California by using our filter options like monthly payment, vehicle price, make, and model to find the best deal."
  },
  {
    question: "Do you provide new car lease specials in California?",
    answer:
      "Yes, we provide updated new car lease specials across California with competitive monthly payments and flexible lease terms."
  },
  {
    question: "Are Mercedes, BMW, and Kia lease specials available?",
    answer:
      "Yes, we offer exclusive Mercedes lease specials, BMW lease specials, and Kia lease specials with affordable monthly payment options."
  },
  {
    question: "Can I find car lease specials in Los Angeles?",
    answer:
      "Yes, we provide car lease specials in Los Angeles with affordable options and a wide selection of vehicles to suit your budget."
  },
  {
    question: "Do you offer affordable car leasing in Los Angeles?",
    answer:
      "Yes, we offer affordable car lease deals in Los Angeles with flexible pricing and budget-friendly monthly payment plans."
  },
  {
    question: "Is car leasing available in Santa Barbara?",
    answer:
      "Yes, we provide car leasing services in Santa Barbara with access to multiple vehicle options and competitive lease offers."
  },
  {
    question: "Can I get auto lease deals in Orange County, California?",
    answer:
      "Yes, we offer auto lease specials in Orange County, California with various pricing options and popular car brands."
  },
  {
    question: "How do I find the best lease deal for my budget?",
    answer:
      "You can set your maximum monthly payment and vehicle price using our filter tool to quickly find lease deals that match your budget."
  },
  {
    question: "Are monthly lease payments fixed for everyone?",
    answer:
      "No, monthly lease payments are estimates and may vary based on credit score, eligibility, and other financial factors."
  }
];
