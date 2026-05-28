import { motion } from "framer-motion";
import { ShieldCheck, Lock, Database, Eye, Mail } from "lucide-react";

export default function Privacy() {
    return (
        <div className="space-y-6 animate-slide-up">


            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl gradient-primary p-6 shadow-glow"
            >
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-primary-foreground" />

                    <div>
                        <h1 className="text-2xl font-bold text-primary-foreground">
                            Privacy Policy
                        </h1>

                        <p className="text-primary-foreground/80 text-sm">
                            Learn how PrepIQ collects, stores, and protects your data.
                        </p>
                    </div>
                </div>
            </motion.div>


            <div className="rounded-2xl bg-card border border-border p-8 md:p-10 space-y-10">

                <section className="space-y-4">

                    <h2 className="text-2xl font-bold text-foreground">
                        Introduction
                    </h2>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ is a full-stack interview preparation platform
                        designed to help users prepare smarter for technical
                        interviews, track applications, and improve career readiness
                        through AI-assisted workflows and analytics.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        This Privacy Policy explains how we collect, use,
                        and safeguard your information while using the platform.
                    </p>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <Database className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            Information We Collect
                        </h2>

                    </div>

                    <ul className="space-y-4 text-muted-foreground leading-8 text-[15px]">

                        <li>
                            • Account information such as name, email address,
                            authentication credentials, and onboarding data
                        </li>

                        <li>
                            • Career DNA profiling information including skills,
                            experience level, goals, and preparation preferences
                        </li>

                        <li>
                            • Mock interview sessions, AI-generated feedback,
                            preparation history, and analytics data
                        </li>

                        <li>
                            • Job application tracking information including
                            company names, statuses, notes, and timelines
                        </li>

                        <li>
                            • Usage analytics and interaction data used to
                            improve platform performance and recommendations
                        </li>

                    </ul>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <Eye className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            How We Use Your Data
                        </h2>

                    </div>

                    <ul className="space-y-4 text-muted-foreground leading-8 text-[15px]">

                        <li>
                            • Generate personalized interview preparation plans
                            and study roadmaps
                        </li>

                        <li>
                            • Provide AI-assisted feedback for mock interviews
                            and preparation sessions
                        </li>

                        <li>
                            • Track preparation progress, interview scores,
                            and learning analytics
                        </li>

                        <li>
                            • Improve NLP and AI-powered recommendation systems
                        </li>

                        <li>
                            • Maintain account security and prevent unauthorized access
                        </li>

                    </ul>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <Lock className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            Security & Protection
                        </h2>

                    </div>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ uses secure authentication mechanisms,
                        encrypted communication, and industry-standard
                        practices to protect user accounts and personal data.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        Passwords are securely hashed and sensitive operations
                        are protected through token-based authentication systems.
                    </p>

                </section>

                <section className="space-y-5">

                    <h2 className="text-2xl font-bold text-foreground">
                        Technologies Used
                    </h2>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ is built using React, TypeScript, FastAPI,
                        PostgreSQL, Tailwind CSS, Framer Motion,
                        OpenRouter AI models, spaCy NLP,
                        scikit-learn, and other modern technologies
                        to deliver an interactive interview preparation experience.
                    </p>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <Mail className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            Contact Us
                        </h2>

                    </div>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        If you have questions regarding this Privacy Policy,
                        data handling, or account security,
                        you may contact the PrepIQ team for support and clarification.
                    </p>

                </section>

            </div>
        </div>
    );
}