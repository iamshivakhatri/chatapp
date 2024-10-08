const LandingLayout = ({children}: {children: React.ReactNode;})=>{
    return (
        <main className="h-full bg-[#212939] overflow-auto">
            <div className="mx-auto max-w-screen-xl h-full ">
            {children}
            </div>  
        </main>
   
    )

}

export default LandingLayout;