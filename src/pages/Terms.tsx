import { motion } from "framer-motion";
import { FileText, ShieldCheck, AlertTriangle, Scale, Mail } from "lucide-react";

export default function Terms() {
    return (
        <div className="space-y-6 animate-slide-up">

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl gradient-primary p-6 shadow-glow"
            >
                <div className="flex items-center gap-3">

                    <FileText className="w-8 h-8 text-primary-foreground" />

                    <div>

                        <h1 className="text-2xl font-bold text-primary-foreground">
                            Terms & Conditions
                        </h1>

                        <p className="text-primary-foreground/80 text-sm">
                            Please read these terms carefully before using PrepIQ.
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
                        Welcome to PrepIQ. By accessing or using the platform,
                        you agree to comply with and be bound by these
                        Terms & Conditions.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ provides interview preparation tools,
                        AI-assisted mock interviews, progress tracking,
                        and job application management features
                        for educational and career development purposes.
                    </p>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <ShieldCheck className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            User Responsibilities
                        </h2>

                    </div>

                    <ul className="space-y-4 text-muted-foreground leading-8 text-[15px]">

                        <li>
                            • Users are responsible for maintaining
                            the confidentiality of their accounts
                            and login credentials
                        </li>

                        <li>
                            • You agree to provide accurate information
                            during onboarding and platform usage
                        </li>

                        <li>
                            • Users must not misuse the platform,
                            exploit vulnerabilities, or attempt
                            unauthorized access
                        </li>

                        <li>
                            • AI-generated recommendations should be used
                            as guidance and not as guaranteed outcomes
                        </li>

                    </ul>

                </section>

                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <Scale className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            Platform Usage
                        </h2>

                    </div>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ is intended for educational,
                        interview preparation, and career tracking purposes.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        We reserve the right to modify, suspend,
                        or discontinue features at any time
                        to improve platform stability and performance.
                    </p>

                </section>
                <section className="space-y-5">

                    <div className="flex items-center gap-3">

                        <AlertTriangle className="w-5 h-5 text-primary" />

                        <h2 className="text-2xl font-bold text-foreground">
                            AI & Recommendation Disclaimer
                        </h2>

                    </div>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ uses AI-powered systems for mock interview
                        feedback, preparation recommendations,
                        and analytics generation.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        While we strive for accuracy,
                        AI-generated outputs may occasionally
                        contain inaccuracies or incomplete suggestions.
                    </p>

                </section>

                <section className="space-y-5">

                    <h2 className="text-2xl font-bold text-foreground">
                        Limitation of Liability
                    </h2>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        PrepIQ shall not be held responsible
                        for interview outcomes, hiring decisions,
                        or career opportunities resulting from
                        platform usage.
                    </p>

                    <p className="text-muted-foreground leading-8 text-[15px]">
                        Users are solely responsible for how they
                        apply interview preparation materials
                        and recommendations.
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
                        If you have any questions regarding these
                        Terms & Conditions, you may contact
                        the PrepIQ team for support and clarification.
                    </p>

                </section>

            </div>

        </div>
    );
}