
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { slugify } from "./slugify";

const initialPostContent = `مرحباً بك في مدونتك الجديدة! هذا هو أول مقال لك. يمكنك تعديله أو حذفه من "إدارة المدونة".

استخدم هذه المساحة لمشاركة أفكارك وخبراتك مع العالم.`;

export const seedInitialPost = async () => {
    try {
        const title = "مرحبًا بك في عالمي";
        const postData = {
            title: title,
            slug: slugify(title),
            content: initialPostContent,
            isPublished: true,
            imageUrl: "https://picsum.photos/seed/intro/1200/630",
            createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "blog_posts"), postData);
        console.log("Initial post seeded successfully.");
    } catch (error) {
        console.error("Error seeding initial post:", error);
    }
};
