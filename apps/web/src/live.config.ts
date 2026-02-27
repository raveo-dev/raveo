import { defineLiveCollection } from "astro:content";
import {
    payloadPostsLoader,
    payloadPagesLoader,
} from "./loaders/payload-loader";

const posts = defineLiveCollection({
    loader: payloadPostsLoader({ cmsUrl: import.meta.env.CMS_URL }),
});

const pages = defineLiveCollection({
    loader: payloadPagesLoader({ cmsUrl: import.meta.env.CMS_URL }),
});

export const collections = { posts, pages };
