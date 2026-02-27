/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        navigation: {
            items: Array<{
                label: string;
                href: string;
                children?: Array<{ label: string; href: string }>;
            }>;
        } | null;
        siteSettings: {
            siteName: string;
            siteDescription: string;
        } | null;
    }
}
