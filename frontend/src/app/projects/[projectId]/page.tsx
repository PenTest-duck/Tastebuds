import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  return (
    <div>
      <h1>Project {params.projectId}</h1>
    </div>
  );
}
