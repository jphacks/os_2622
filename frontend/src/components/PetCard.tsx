import type { Pet } from "../state/demo";

export function PetCard({ pet }: { pet: Pet }) {
  return <article className="pet-summary pet-card" aria-label={pet.name}>
    <div className="pet-avatar" aria-hidden="true">☁️</div>
    <h2>{pet.name}</h2>
    <p className="pet-personality">{pet.personality}</p>
    <div className="tag-list">
      {pet.interests.map((interest) => <span className="interest-tag" key={interest}>{interest}</span>)}
    </div>
    <div className="summary-divider" />
    <p className="field-hint">誕生日：{new Date(pet.createdAt).toLocaleDateString("ja-JP")}</p>
  </article>;
}
