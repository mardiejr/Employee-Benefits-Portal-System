"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar"; 
import useUserProfile from "../hooks/useUserProfile";
import { ChevronUp } from "lucide-react";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 z-50 transition-opacity duration-300 ease-in-out"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
};

const PrivacyPolicyPage = () => {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <EmployeeNavbar isApprover={isApprover} />    

      {/* Main Content */}
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Employee Conduct Statement Section */}
        <section className="mb-8 md:mb-12">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-red-700">
                ⚖️ Employee Responsibility and Conduct Statement
              </h2>
            </div>
            <div className="bg-white rounded-lg p-6 border-l-4 border-red-500">
              <p className="text-gray-800 leading-relaxed">
                <strong>Notice:</strong> All employees are hereby reminded that they are responsible for ensuring the accuracy, relevance, and integrity of any information they input, upload, or publish on this website. The submission or dissemination of false, misleading, malicious, or inappropriate content—including but not limited to impractical jokes or any form of misconduct—constitutes a violation of company policy and may result in administrative or disciplinary action, up to and including termination of employment, and, where applicable, legal liability under existing laws and regulations.
              </p>
            </div>
          </div>
        </section>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-yellow-500 mb-8 md:mb-12">
          Our Mission and Vision
        </h1>

        {/* Mission and Vision Section */}
        <section className="mb-8 md:mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mission Box */}
            <div className="bg-blue-900 text-white rounded-2xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-500">
                Mission
              </h2>
              <p className="text-sm md:text-base leading-relaxed">
                Our mission is to provide a full-range of high-value insurance products and other related services that empower families to attain financial security and fulfill their dreams, thus helping build a stronger Philippines.
              </p>
            </div>

            {/* Vision Box */}
            <div className="bg-blue-900 text-white rounded-2xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-500">
                Vision
              </h2>
              <p className="text-sm md:text-base leading-relaxed">
                To be the market leader in the insurance industry to whom more Filipinos entrust the financial security of their families. We are Insular Life, the pioneering and largest Filipino life insurance company.
              </p>
            </div>
          </div>
        </section>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-yellow-500 mb-8 md:mb-12">
          Privacy Policy
        </h1>

        {/* Introduction */}
        <div className="mb-8 md:mb-12 text-gray-800 leading-relaxed space-y-4">
          <p>
            The Insular Life Assurance Co., Ltd. and its subsidiaries (individually and collectively
            referred to as "Insular Life") are committed to safeguarding the privacy of their data
            subjects; this policy specifies how your personal data is dealt with. Using Insular Life's
            digital platforms or doing offline transactions in person at our branches, implies that
            you accept the terms of this privacy policy.
          </p>
          <p>
            Insular Life, as your data controller, shall ensure that the obligations set forth by the
            Data Privacy Act of 2012 and its implementing rules and regulations are carried out
            through the processing of your personal information.
          </p>
          <p>
            This privacy policy applies only to information collected either online through the
            official websites, mobile applications, and social media pages (collectively referred
            to as "digital platforms"); or offline, including over-the-counter transactions. We may
            amend this privacy policy at any time by publishing a new version on this website.
          </p>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-yellow-500 mb-8 md:mb-12">
          Privacy Policy
        </h1>

        {/* What Information We Collect */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            WHAT INFORMATION WE COLLECT
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Box */}
            <div className="bg-blue-900 text-white rounded-2xl p-6 md:p-8">
              <h3 className="font-bold text-lg mb-4">
                Insular Life reserves the right to collect, store, and use the following kinds of information:
              </h3>
              <ul className="space-y-2 text-sm md:text-base">
                <li>• Name</li>
                <li>• Email address</li>
                <li>• Contact Number</li>
                <li>• Geographical location</li>
                <li>• IP address</li>
                <li>• Browser type and version</li>
                <li>• Operating system</li>
                <li>• Referral source</li>
                <li>• Length of visit</li>
                <li>• Page views</li>
                <li>• Website navigation; and</li>
                <li>• Any other personal information that you opt to provide to us</li>
              </ul>
            </div>

            {/* Right Boxes */}
            <div className="space-y-6">
              {/* Audio/Video Box */}
              <div className="bg-blue-900 text-white rounded-2xl p-6 md:p-8">
                <h3 className="font-bold text-lg mb-4">
                  For audio or video recordings:
                </h3>
                <ul className="space-y-2 text-sm md:text-base">
                  <li>• Your voice and spoken words</li>
                  <li>• Your image and actions</li>
                  <li>• Details of the transaction being conducted</li>
                </ul>
              </div>

              {/* Yellow Box */}
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 text-white rounded-2xl p-6 md:p-8">
                <p className="text-sm md:text-base leading-relaxed">
                  <strong>Insular Life reserves the right to collect information from its users when users
                  browse the company's websites and submit questions through the Contact Us page and when
                  customers conduct transactions in person at our branches.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Use Your Information For */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            WHAT WE USE YOUR INFORMATION FOR
          </h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            <p className="font-semibold mb-4 text-gray-800">
              Any of the relevant information collected from you may be used in one of the following ways:
            </p>
            <ul className="space-y-4 text-gray-800">
              <li className="flex">
                <span className="mr-2">•</span>
                <span>
                  To personalize your experience. Your information helps us to better respond to
                  your individual needs to improve our digital platforms. We continually strive to
                  improve our offerings based on the information and feedback we receive from you.
                </span>
              </li>
              <li className="flex">
                <span className="mr-2">•</span>
                <span>
                  To improve customer service. Your information helps us to more effectively
                  respond to your customer service requests and support your needs.
                </span>
              </li>
              <li className="flex">
                <span className="mr-2">•</span>
                <span>To administer a contest, promotion, survey or other site feature.</span>
              </li>
              <li className="flex">
                <span className="mr-2">•</span>
                <span>
                  To send periodic emails. The email address you provide may be used to send
                  you information and updates pertaining to receiving occasional company
                  news, updates, related product or service information, etc.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* How We Protect Your Information */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            HOW WE PROTECT YOUR INFORMATION
          </h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8 space-y-4 text-gray-800">
            <p>
              Insular Life implements physical, technical, and organizational security
              measures aligned with industry standards in order to ensure the
              confidentiality, integrity, and availability of any personal data that is
              submitted to us. We educate our employees on the best practices for
              handling your personal data. Whenever we engage other organizations
              to provide service to us, we require them to protect your personal data
              aligned with Insular Life's security standards.
            </p>
            <p>
              It is important to note that data transmission over the Internet is, by
              nature, insecure and we cannot guarantee the security of data sent over
              the Internet. We are not responsible for any delays, crashes, and other
              problems caused by the Internet, your Internet Service Provider, and other
              parties involved in the transmission of data.
            </p>
          </div>
        </section>

        {/* How We May Share Your Information */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            HOW WE MAY SHARE YOUR INFORMATION
          </h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8 space-y-4 text-gray-800">
            <p>
              Insular Life, subject to specific lawful exceptions, shall not disclose, release or sell to
              third parties any personal data or information given or transmitted through the
              Internet. This does not include trusted third parties who provide assistance in
              operating the websites, conducting business as usual or servicing you, so long as
              those parties agree to keep this information confidential. We may also release your
              information when we believe release is appropriate to comply with the law, enforce
              our site policies, or protect our rights, property, or safety. However, non-personally
              identifiable visitor information may be provided to other parties for marketing,
              advertising, or other uses relevant to the brand.
            </p>
            <p>
              Insular Life shall not use personal data or information given or transmitted through the
              Internet for purposes other than what has been described on this website. However,
              due to the nature of the Internet as an unsecured medium of communication, the
              company reserves the right to refrain from giving out an absolute guarantee that the
              privacy or confidentiality of the personal data or information given or transmitted by
              the user is free from any unfavorable instances that may occur. Insular Life shall not
              be held liable for damages for any loss of confidentiality of any information
              transmitted herein.
            </p>
          </div>
        </section>

        {/* How Long We Keep Your Information */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            HOW LONG WE KEEP YOUR INFORMATION
          </h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8 space-y-4 text-gray-800">
            <p>
              Insular Life guarantees that your personal data shall not be stored
              longer than is necessary for as long as the purpose for which it was
              collected, and other purposes that you may consented from time to
              time, remain in effect until such time as it is no longer required or
              necessary.
            </p>
            <p>
              Your information shall be kept by Insular Life for the fulfillment of its
              obligations and compliance with legal, regulatory, and business
              requirements, or other standard set forth by a governing body.
            </p>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-yellow-500 mb-6 md:mb-8">
            YOUR RIGHTS
          </h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            <ul className="space-y-4 text-gray-800">
              <li>
                <strong>• Right to Information:</strong> You have the right to be informed about the collection, processing, and
                disposal of your personal data.
              </li>
              <li>
                <strong>• Right to Object:</strong> You have the right to object to the processing of your personal data by explicitly
                withdrawing your consent previously provided upon data collection.
              </li>
              <li>
                <strong>• Right to Access:</strong> Upon demand, you have the right to reasonable access to the contents of your
                personal data.
              </li>
              <li>
                <strong>• Right to Rectification:</strong> You have the right to dispute the inaccuracy or error in the personal data
                and have it immediately and accordingly corrected, unless the request is vexatious or otherwise
                unreasonable.
              </li>
              <li>
                <strong>• Right to Erasure or Blocking:</strong> Based on reasonable grounds, you have the right to suspend,
                withdraw or order the blocking, removal or destruction of your personal data from Insular Life's
                system.
              </li>
              <li>
                <strong>• Right to Damages:</strong> Subject to the results of verification of investigation, you may be indemnified for
                any damages sustained due to unauthorized use of your personal data.
              </li>
              <li>
                <strong>• Right to Data Portability:</strong> You have the right to request from Insular Life a copy of your personal
                data that is processed by electronic means in a structured or commonly used format.
              </li>
              <li>
                <strong>• Right to File a Complaint:</strong> If you feel that your personal data has been misused, maliciously
                disclosed, or improperly disposed of, or that any of your data privacy rights have been violated, you
                have the right to file a complaint with Insular Life at{' '}
                <a href="mailto:dataprivacy@insular.com.ph" className="text-blue-600 hover:underline">
                  dataprivacy@insular.com.ph
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Insular Life. All rights reserved.</p>
        </div>
      </footer>
      <ScrollToTopButton />
    </div>
  );
};

export default PrivacyPolicyPage;