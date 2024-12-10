function Footer() {
    return (
      <footer className="relative bg-black w-full h-15 flex flex-wrap items-center px-5 py-3 justify-between min-[400px]:justify-center">
        <a className="text-center px-2 github text-white mt-3 ml-6 shrink-0 min-[740px]:mt-0" href="https://github.com/pappitti/sector-classification-assistant" rel="noreferrer" target="_blank">
          code (TODO : href)
        </a>
        <div className='relative min-w-[360px] mt-3 justify-center text-white flex flex-nowrap items-center grow min-[740px]:mt-1 min-[740px]:justify-end'> 
          <a href="https://twitter.com/PITTI_DATA" rel="noreferrer" target="_blank"
            className="text-center px-2 maintwitter text-white mt-3 mr-6 shrink-0 min-[740px]:mt-0"
          >
            Nous suivre
          </a>
        </div>
      </footer>
    )
  };

export default Footer;