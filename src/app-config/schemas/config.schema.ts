import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AppConfig extends Document {
    @Prop({ default: 21.0285 }) latitude: number;
    @Prop({ default: 105.8542 }) longitude: number;
    @Prop({ default: 100 }) radius: number; // mét
    @Prop({ default: '08:00' }) startTime: string;
    @Prop({ default: '17:00' }) endTime: string;
}
export const AppConfigSchema = SchemaFactory.createForClass(AppConfig);