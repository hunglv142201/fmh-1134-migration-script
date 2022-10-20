import { Entry, EntryProps } from "contentful-management";

export type Video = Entry & EntryProps<{
    additionalImageFiles: FieldProps<Array<Reference>> | null | undefined;
    additionalAudioFiles: FieldProps<Array<Reference>> | null | undefined;
}>;

export type Image = LinkedEntry<{
    isLogo: FieldProps<boolean> | null | undefined;
    isSearchable: FieldProps<boolean> | null | undefined;
}>;

export type Audio = LinkedEntry;

export type LinkedEntry<T = {}> = Entry & EntryProps<{
    linkedEntries: FieldProps<Array<Reference>> | null | undefined;
} & T>;

export type Reference = {
    sys: {
        type: 'Link';
        linkType: 'Entry' | 'Asset';
        id: string;
    }
}

export type FieldProps<T> = Record<string, T>;
