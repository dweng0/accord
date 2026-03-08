import { AccordMetadata } from '../types';
export interface PinataConfig {
    apiKey: string;
    secretApiKey: string;
}
export declare class MetadataUploader {
    private pinata;
    constructor(config: PinataConfig);
    testAuthentication(): Promise<boolean>;
    uploadMetadata(metadata: AccordMetadata): Promise<string>;
    uploadImage(filePath: string): Promise<string>;
    uploadImages(iconPath?: string, bannerPath?: string): Promise<{
        icon?: string;
        banner?: string;
    }>;
    uploadBanList(banList: any): Promise<string>;
    uploadAdminList(adminList: any): Promise<string>;
    unpin(ipfsHash: string): Promise<void>;
    listPinned(): Promise<any[]>;
    private validateMetadata;
    private isValidIpfsUrl;
}
export declare function createMetadata(name: string, description: string, options?: {
    icon?: string;
    banner?: string;
    category?: string;
    rules?: string[];
    banlist?: string;
    adminlist?: string;
    links?: {
        website?: string;
        twitter?: string;
        discord?: string;
    };
}): AccordMetadata;
//# sourceMappingURL=metadata-uploader.d.ts.map