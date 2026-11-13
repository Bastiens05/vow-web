import { isoToFrench } from "@/lib/domain/french-date";
import { TextInput } from "@/components/ui/field";

export function FrenchDateInput({
  name,
  required = false,
  defaultValue = "",
}: {
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <TextInput
      name={name}
      lang="fr"
      inputMode="numeric"
      placeholder="jj/mm/aaaa"
      autoComplete="off"
      required={required}
      pattern="\d{2}/\d{2}/\d{4}"
      title="jj/mm/aaaa"
      defaultValue={defaultValue ? isoToFrench(defaultValue) : undefined}
    />
  );
}
