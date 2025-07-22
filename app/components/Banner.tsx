'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  {
    image: '/banner/1.png',
  },
  {
    image: '/banner/2.png',
  },
  {
    image: '/banner/3.png',
  },
  {
    image: '/banner/4.png',
  },
  {
    image: '/banner/5.png',
  },
];

export default function Banner() {
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-md mb-8">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="w-full h-56 md:h-72 lg:h-80"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div
              className="w-full h-full bg-cover bg-center flex flex-col justify-center items-center text-white text-center px-6"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
