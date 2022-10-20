import { createClient, Environment } from 'contentful-management';
import { contentful as contentfulConfig } from './config';
import { Audio, Image, LinkedEntry, Video } from "./types";

let api: Environment;

const main = async (): Promise<void> => {
    try {
        console.log(`Script started at ${Date.now()}\n`);

        console.log(`CONFIG:
          CONTENTFUL_SPACE_ID                    : ${contentfulConfig.spaceId}
          CONTENTFUL_ENVIRONMENT                 : ${contentfulConfig.environment}
          CONTENTFUL_MANAGEMENT_API_ACCESS_TOKEN : ${contentfulConfig.managementApiAccessToken}\n`);

        api = await getEnvironmentApi();
        if (!api) {
            throw { message: 'api is null, this script will be terminated now' };
        }

        await updateLinkedEntries(await getAllVideos());

        await updateAllImages();

    } catch (err: any) {
        console.error(err.message ?? err);
    } finally {
        console.log(`\nScript ended at ${Date.now()}`);
    }
};

const updateLinkedEntries = async (videos: Array<Video>): Promise<void> => {
    console.log(`\nUpdate LinkedEntries script started at ${Date.now()}`)

    const updateEntries = async (entries: Array<LinkedEntry>, linkedVideo: Video): Promise<void> => {
        entries.forEach(entry => {
            if (!entry.fields.linkedEntries) {
                entry.fields.linkedEntries = { 'en': [] };
            } else if (!entry.fields.linkedEntries.en) {
                entry.fields.linkedEntries.en = [];
            }

            entry.fields.linkedEntries.en.push({
                sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: linkedVideo.sys.id
                }
            });
        });

        await Promise.all(entries.map((entry, index) => (async () => {
            await delay(100 * index); // Avoid API rate limit

            const isPublished = entry.isPublished();
            const updatedEntry = await entry.update();
            if (isPublished) {
                try {
                    await updatedEntry.publish();
                } catch (err) {
                    console.error(`Validation failed for entryId : ${updatedEntry.sys.id}`);
                }
            }
        })()));
    }

    for (let i = 0; i < videos.length; i++) {
        const video: Video = videos[i];

        if (video.fields.additionalImageFiles) {
            const images = (await api.getEntries({
                content_type: 'image',
                'sys.id[in]': video.fields.additionalImageFiles.en.map(img => img.sys.id).join(','),
                limit: 1000
            })).items as Array<Image>;
            await updateEntries(images, video);
        }

        if (video.fields.additionalAudioFiles) {
            const audios = (await api.getEntries({
                content_type: 'bynderAudio',
                'sys.id[in]': video.fields.additionalAudioFiles.en.map(aud => aud.sys.id).join(','),
                limit: 1000
            })).items as Array<Audio>;
            await updateEntries(audios, video);
        }
    }

    console.log(`Update LinkedEntries script ended at ${Date.now()}`)
};

const updateAllImages = async (): Promise<void> => {
    console.log(`\nUpdate all Images script started at ${Date.now()}`)

    const images = (await api.getEntries({ content_type: 'image', limit: 1000 })).items as Array<Image>;

    images.forEach(image => {
        image.fields.isSearchable = { en: true };
        image.fields.isLogo = { en: false };
    });

    await Promise.all(images.map((image, index) => (async () => {
        await delay(100 * index); // Avoid API rate limit

        const isPublished = image.isPublished();
        const updatedImage = await image.update();
        if (isPublished) {
            try {
                await updatedImage.publish();
            } catch (err) {
                console.error(`Validation failed for entryId : ${updatedImage.sys.id}`);
            }
        }
    })()));

    console.log(`\nUpdate all Images script ended at ${Date.now()}`)
}

const getEnvironmentApi = async (): Promise<Environment> => {
    const client = createClient({ accessToken: contentfulConfig.managementApiAccessToken });
    const space = await client.getSpace(contentfulConfig.spaceId);
    return await space.getEnvironment(contentfulConfig.environment);
};

const getAllVideos = async (): Promise<Array<Video>> => {
    return (await api.getEntries({ content_type: 'video', limit: 1000 })).items as Array<Video>;
}

const delay = (millisecond: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, millisecond));
}

main();
