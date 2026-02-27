import { defineLiveCollection } from "astro:content";
import { payloadPostsLoader } from "./loaders/payload-loader";

const posts = defineLiveCollection({
    loader: payloadPostsLoader({
        cmsUrl: import.meta.env.CMS_URL,
    }),
});

export const collections = { posts };
