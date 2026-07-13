import HumanVectorAtlas, { type Profile } from "../HumanVectorAtlas";
import profiles from "../data/ecgProfiles.json";

export default function ParticipantPage() {
  return <HumanVectorAtlas profiles={profiles as unknown as Profile[]} />;
}
