type RatingsConfig = {
  lookbackWeeks: number;
};

const lookbackWeeks = 52 * 3; // 3 years

export const ratingsConfig: RatingsConfig = {
  lookbackWeeks,
};
