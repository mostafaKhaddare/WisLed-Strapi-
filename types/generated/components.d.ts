import type { Struct, Schema } from '@strapi/strapi';

export interface SectionsHotspot extends Struct.ComponentSchema {
  collectionName: 'components_sections_hotspots';
  info: {
    displayName: 'Hotspot';
  };
  attributes: {
    product_handle: Schema.Attribute.String & Schema.Attribute.Required;
    position_x: Schema.Attribute.Integer;
    position_y: Schema.Attribute.Integer;
  };
}

export interface SectionsHEader extends Struct.ComponentSchema {
  collectionName: 'components_sections_h_eaders';
  info: {
    displayName: 'Header';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String;
    Text: Schema.Attribute.Text;
    Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
  };
}

export interface SectionsContactGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_contact_grids';
  info: {
    displayName: 'Contact Grid';
  };
  attributes: {
    Title: Schema.Attribute.String;
    ContactMethods: Schema.Attribute.Component<'contact.contact-card', true>;
  };
}

export interface HomepageHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero_banners';
  info: {
    displayName: 'HeroBanner';
    icon: '';
    description: '';
  };
  attributes: {
    Headline: Schema.Attribute.String & Schema.Attribute.Required;
    Text: Schema.Attribute.Text;
    CTA: Schema.Attribute.Component<'homepage.cta', false>;
    Image: Schema.Attribute.Media<'images' | 'files', true>;
  };
}

export interface HomepageCta extends Struct.ComponentSchema {
  collectionName: 'components_homepage_ctas';
  info: {
    displayName: 'CTA';
  };
  attributes: {
    BtnText: Schema.Attribute.String;
    BtnLink: Schema.Attribute.String;
  };
}

export interface FaqFaq extends Struct.ComponentSchema {
  collectionName: 'components_faq_faqs';
  info: {
    displayName: 'FAQ';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Question: Schema.Attribute.Component<'faq.faq-question', true>;
    Bookmark: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FaqFaqQuestion extends Struct.ComponentSchema {
  collectionName: 'components_faq_faq_questions';
  info: {
    displayName: 'FaqQuestion';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ContactContactCard extends Struct.ComponentSchema {
  collectionName: 'components_contact_contact_cards';
  info: {
    displayName: 'Contact Card';
    description: '';
  };
  attributes: {
    Icon: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    Title: Schema.Attribute.String;
    Text: Schema.Attribute.String;
    Link: Schema.Attribute.String;
  };
}

export interface ColorImageColorImage extends Struct.ComponentSchema {
  collectionName: 'components_color_image_color_images';
  info: {
    displayName: 'ColorImage';
    icon: 'picture';
  };
  attributes: {
    Image: Schema.Attribute.Media<'images' | 'files'>;
  };
}

export interface ColorHexColorHex extends Struct.ComponentSchema {
  collectionName: 'components_color_hex_color_hexes';
  info: {
    displayName: 'ColorHex';
    icon: 'brush';
  };
  attributes: {
    Color: Schema.Attribute.String;
  };
}

export interface AboutUsWhyUs extends Struct.ComponentSchema {
  collectionName: 'components_about_us_whyuses';
  info: {
    displayName: 'FramedTextContentSection';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Tile: Schema.Attribute.Component<'about-us.tile', true>;
  };
}

export interface AboutUsTile extends Struct.ComponentSchema {
  collectionName: 'components_about_us_tiles';
  info: {
    displayName: 'Tile';
  };
  attributes: {
    Image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface AboutUsNumericalContent extends Struct.ComponentSchema {
  collectionName: 'components_about_us_numerical_contents';
  info: {
    displayName: 'NumericalContentSection';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface AboutUsContentSection extends Struct.ComponentSchema {
  collectionName: 'components_about_us_content_sections';
  info: {
    displayName: 'ImageTextContentSection';
    description: '';
  };
  attributes: {
    Title: Schema.Attribute.String & Schema.Attribute.Required;
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
    Image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'sections.hotspot': SectionsHotspot;
      'sections.h-eader': SectionsHEader;
      'sections.contact-grid': SectionsContactGrid;
      'homepage.hero-banner': HomepageHeroBanner;
      'homepage.cta': HomepageCta;
      'faq.faq': FaqFaq;
      'faq.faq-question': FaqFaqQuestion;
      'contact.contact-card': ContactContactCard;
      'color-image.color-image': ColorImageColorImage;
      'color-hex.color-hex': ColorHexColorHex;
      'about-us.why-us': AboutUsWhyUs;
      'about-us.tile': AboutUsTile;
      'about-us.numerical-content': AboutUsNumericalContent;
      'about-us.content-section': AboutUsContentSection;
    }
  }
}
