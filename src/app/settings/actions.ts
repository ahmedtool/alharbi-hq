import { supabase } from "@/lib/supabase";

/** Changes the signed-in user's password after re-checking the current one. */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (newPassword.length < 8) {
        return { success: false, message: "كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل." };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
        return { success: false, message: "لازم تكون مسجّل دخول." };
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (signInError) {
        return { success: false, message: "كلمة المرور الحالية غير صحيحة." };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        console.error("Error updating password:", error);
        return { success: false, message: "تعذّر تحديث كلمة المرور." };
    }
    return { success: true, message: "تم تحديث كلمة المرور بنجاح!" };
}
