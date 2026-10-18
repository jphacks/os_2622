import { useEffect, useState } from "react";

export function PetAvatar({ did, name }: { did: string; name: string }) {
  const [profile, setProfile] = useState<{ did: string; avatar: string | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAvatar() {
      try {
        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = await response.json() as { avatar?: string };
        if (!controller.signal.aborted) {
          setProfile({ did, avatar: typeof data.avatar === "string" && data.avatar.startsWith("https://") ? data.avatar : null });
        }
      } catch {
        // Keep the default icon when the public profile cannot be loaded.
      }
    }
    void loadAvatar();
    return () => controller.abort();
  }, [did]);

  const avatar = profile?.did === did ? profile.avatar : null;
  return <a
    className="pet-avatar pet-avatar-link"
    href={`https://bsky.app/profile/${encodeURIComponent(did).replace(/%3A/g, ":")}`}
    aria-label={`${name}のBlueskyアカウントを開く`}
  >
    {avatar ? <img
      src={avatar}
      alt=""
      width={84}
      height={84}
      onError={() => setProfile({ did, avatar: null })}
    /> : <span aria-hidden="true">☁️</span>}
  </a>;
}
