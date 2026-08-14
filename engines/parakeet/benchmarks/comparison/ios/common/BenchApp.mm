#import <UIKit/UIKit.h>

#include "EngineAdapter.h"

#include <cstdio>
#include <cstdlib>
#include <string>
#include <unistd.h>
#include <vector>

namespace {

std::vector<std::string> launch_arguments;

void store_launch_arguments(int argc, char ** argv) {
    launch_arguments.reserve(static_cast<size_t>(argc));
    for (int index = 0; index < argc; ++index) {
        launch_arguments.emplace_back(argv[index]);
    }
}

std::vector<char *> mutable_arguments() {
    std::vector<char *> arguments;
    arguments.reserve(launch_arguments.size());
    for (std::string & argument : launch_arguments) {
        arguments.push_back(argument.data());
    }
    return arguments;
}

bool change_to_documents_directory() {
    NSURL * documents = [[[NSFileManager defaultManager]
        URLsForDirectory:NSDocumentDirectory
        inDomains:NSUserDomainMask] firstObject];
    return documents != nil && chdir(documents.fileSystemRepresentation) == 0;
}

void finish_with_status(int status) {
    std::fflush(stdout);
    std::fflush(stderr);
    dispatch_async(dispatch_get_main_queue(), ^{
        std::exit(status);
    });
}

void run_engine() {
    if (!change_to_documents_directory()) {
        std::fprintf(stderr, "error: failed to change to the app Documents directory\n");
        finish_with_status(70);
        return;
    }

    std::vector<char *> arguments = mutable_arguments();
    const int status = bench_engine_main(
        static_cast<int>(arguments.size()),
        arguments.data());
    finish_with_status(status);
}

}

@interface BenchAppDelegate : UIResponder <UIApplicationDelegate>
@property(strong, nonatomic) UIWindow * window;
@end

@implementation BenchAppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    (void)application;
    (void)launchOptions;
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    self.window.rootViewController = [[UIViewController alloc] init];
    [self.window makeKeyAndVisible];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        @autoreleasepool {
            run_engine();
        }
    });
    return YES;
}

@end

int main(int argc, char ** argv) {
    @autoreleasepool {
        store_launch_arguments(argc, argv);
        return UIApplicationMain(
            argc,
            argv,
            nil,
            NSStringFromClass([BenchAppDelegate class]));
    }
}
